import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServicePackGovernanceAuditEventType,
  ServicePackGovernanceLifecycleStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { type AuthorityEvaluationResponseDto } from '../../authority/evaluation/dto/authority-evaluation-response.dto';
import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { type AcceptServicePackDto } from './dto/accept-service-pack.dto';
import { type RejectServicePackDto } from './dto/reject-service-pack.dto';
import { type SubmitForAcceptanceDto } from './dto/submit-for-acceptance.dto';
import { SERVICE_PACK_GOVERNANCE_REASON_CODES } from './service-pack-governance.constants';
import { ServicePackGovernanceAuditService } from './service-pack-governance-audit.service';
import { ServicePackGovernanceBoundaryService } from './service-pack-governance-boundary.service';
import { ServicePackReviewService } from './service-pack-review.service';
import { buildServicePackVersionGovernanceFingerprint } from './service-pack-version-fingerprint.util';

@Injectable()
export class ServicePackAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ServicePackGovernanceBoundaryService,
    private readonly audit: ServicePackGovernanceAuditService,
    private readonly reviews: ServicePackReviewService,
  ) {}

  async submitForAcceptance(
    servicePackId: string,
    actor: ActorContext,
    dto: SubmitForAcceptanceDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);

    const version = await this.loadVersion(servicePackId, dto.servicePackVersionId);
    if (version.manifestValidationStatus !== ServicePackManifestValidationStatus.VALIDATED) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.NOT_VALIDATED);
    }

    await this.reviews.assertRequiredReviewsComplete(version.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.servicePackVersion.update({
        where: { id: version.id },
        data: {
          manifestValidationStatus: ServicePackManifestValidationStatus.PENDING_REVIEW,
          governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.PENDING_ACCEPTANCE,
        },
      });

      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: version.id,
          eventType: ServicePackGovernanceAuditEventType.SUBMITTED_FOR_ACCEPTANCE,
          actorIdentityId: actor.identityId,
        },
        tx,
      );
    });

    return { servicePackVersionId: version.id, governanceLifecycleStatus: 'PENDING_ACCEPTANCE' };
  }

  async acceptInstitutionally(
    servicePackId: string,
    actor: ActorContext,
    dto: AcceptServicePackDto,
    authorityEvaluation: AuthorityEvaluationResponseDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    this.boundary.assertHumanInstitutionalAcceptanceActor(actor.identityType);

    const version = await this.loadVersion(servicePackId, dto.servicePackVersionId);
    this.boundary.assertVersionCompiledForGovernance(version.status);

    if (
      version.governanceLifecycleStatus !== ServicePackGovernanceLifecycleStatus.PENDING_ACCEPTANCE
    ) {
      throw new BadRequestException(
        SERVICE_PACK_GOVERNANCE_REASON_CODES.VERSION_NOT_PENDING_ACCEPTANCE,
      );
    }

    await this.reviews.assertRequiredReviewsComplete(version.id);

    const fingerprint = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: version.compilationFingerprint,
      manifestChecksum: version.manifestChecksum,
    });

    const appointment = actor.activeAppointments.find(
      (item) => item.institutionId === version.servicePack.institutionId,
    );

    const acceptance = await this.prisma.$transaction(async (tx) => {
      const record = await tx.servicePackAcceptanceRecord.create({
        data: {
          servicePackId,
          servicePackVersionId: version.id,
          institutionId: version.servicePack.institutionId,
          acceptingIdentityId: actor.identityId,
          officeholderId: appointment?.officeholderId,
          appointmentId: appointment?.appointmentId,
          authorityEvaluationRecordId: authorityEvaluation.evaluationId,
          acceptedScope: (dto.acceptedScope ?? {}) as Prisma.InputJsonValue,
          acceptanceConditions: (dto.acceptanceConditions ?? []) as Prisma.InputJsonValue,
          unresolvedAcceptedRisks: (dto.unresolvedAcceptedRisks ?? []) as Prisma.InputJsonValue,
          versionFingerprint: fingerprint,
          isActive: true,
        },
      });

      await tx.servicePackVersion.update({
        where: { id: version.id },
        data: {
          status: ServicePackVersionStatus.ACCEPTED,
          immutable: true,
          acceptedAt: new Date(),
          acceptedByIdentityId: actor.identityId,
          governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.INSTITUTIONALLY_ACCEPTED,
          manifestValidationStatus: ServicePackManifestValidationStatus.PENDING_REVIEW,
        },
      });

      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: version.id,
          eventType: ServicePackGovernanceAuditEventType.INSTITUTIONALLY_ACCEPTED,
          actorIdentityId: actor.identityId,
          metadata: {
            acceptanceRecordId: record.id,
            versionFingerprint: fingerprint,
            authorityEvaluationId: authorityEvaluation.evaluationId,
          },
        },
        tx,
      );

      return record;
    });

    return acceptance;
  }

  async reject(servicePackId: string, actor: ActorContext, dto: RejectServicePackDto) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);

    const version = await this.loadVersion(servicePackId, dto.servicePackVersionId);

    const rejection = await this.prisma.$transaction(async (tx) => {
      const record = await tx.servicePackRejectionRecord.create({
        data: {
          servicePackId,
          servicePackVersionId: version.id,
          rejectedByIdentityId: actor.identityId,
          reason: dto.reason,
        },
      });

      await tx.servicePackVersion.update({
        where: { id: version.id },
        data: {
          governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.REJECTED,
        },
      });

      await this.audit.record(
        {
          servicePackId,
          servicePackVersionId: version.id,
          eventType: ServicePackGovernanceAuditEventType.REJECTED,
          actorIdentityId: actor.identityId,
          metadata: { rejectionRecordId: record.id },
        },
        tx,
      );

      return record;
    });

    return rejection;
  }

  async invalidateAcceptanceForFingerprintChange(
    servicePackVersionId: string,
    actorIdentityId: string,
    reason: string,
  ): Promise<void> {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: servicePackVersionId },
    });
    if (!version) {
      return;
    }

    const fingerprint = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: version.compilationFingerprint,
      manifestChecksum: version.manifestChecksum,
    });

    await this.prisma.$transaction(async (tx) => {
      const activeRecords = await tx.servicePackAcceptanceRecord.findMany({
        where: { servicePackVersionId, isActive: true },
      });

      for (const record of activeRecords) {
        if (record.versionFingerprint === fingerprint) {
          continue;
        }
        await tx.servicePackAcceptanceRecord.update({
          where: { id: record.id },
          data: {
            isActive: false,
            invalidatedAt: new Date(),
            invalidationReason: reason,
          },
        });
        await this.audit.record(
          {
            servicePackId: record.servicePackId,
            servicePackVersionId,
            eventType: ServicePackGovernanceAuditEventType.ACCEPTANCE_INVALIDATED,
            actorIdentityId,
            metadata: { acceptanceRecordId: record.id, reason },
          },
          tx,
        );
      }
    });
  }

  async assertActiveAcceptanceForDeployment(servicePackVersionId: string): Promise<void> {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: servicePackVersionId },
    });
    if (!version) {
      throw new NotFoundException(`Service pack version ${servicePackVersionId} not found`);
    }

    this.boundary.assertRejectedOrWithdrawnCannotDeploy(version.governanceLifecycleStatus);

    const fingerprint = buildServicePackVersionGovernanceFingerprint({
      compilationFingerprint: version.compilationFingerprint,
      manifestChecksum: version.manifestChecksum,
    });

    const activeAcceptance = await this.prisma.servicePackAcceptanceRecord.findFirst({
      where: {
        servicePackVersionId,
        isActive: true,
        versionFingerprint: fingerprint,
      },
    });

    if (!activeAcceptance) {
      throw new BadRequestException(SERVICE_PACK_GOVERNANCE_REASON_CODES.VALIDATION_NOT_ACCEPTANCE);
    }
  }

  private async loadVersion(servicePackId: string, servicePackVersionId: string) {
    const version = await this.prisma.servicePackVersion.findFirst({
      where: { id: servicePackVersionId, servicePackId },
      include: { servicePack: true },
    });
    if (!version) {
      throw new NotFoundException(
        `Service pack version ${servicePackVersionId} not found for pack ${servicePackId}`,
      );
    }
    return version;
  }
}
