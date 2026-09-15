import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BreakGlassAccessStatus,
  CredentialRotationStatus,
  CredentialStatus,
  PrivilegedAccessReviewStatus,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';
import { CybersecurityBoundaryService } from '../common/cybersecurity-boundary.service';
import { generateCybersecurityReference } from '../common/reference-number.util';
import {
  BREAK_GLASS_EVENT_NUMBER_PREFIX,
  CREDENTIAL_ROTATION_NUMBER_PREFIX,
  PRIVILEGED_ACCESS_REVIEW_NUMBER_PREFIX,
  SERVICE_IDENTITY_REVIEW_NUMBER_PREFIX,
} from '../cybersecurity.constants';
import {
  ActivateBreakGlassAccessDto,
  CreateBreakGlassAccessEventDto,
  CreateCredentialRotationRecordDto,
  CreatePrivilegedAccessReviewDto,
  CreateServiceIdentityReviewDto,
} from '../dto/privileged-access.dto';

@Injectable()
export class PrivilegedAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CybersecurityBoundaryService,
    private readonly audit: SecurityAuditService,
  ) {}

  async schedulePrivilegedAccessReview(dto: CreatePrivilegedAccessReviewDto) {
    this.boundary.assertNoSharedAdministratorAccount(
      dto.environment,
      dto.isSharedAdministratorAccount ?? false,
    );

    return this.prisma.privilegedAccessReview.create({
      data: {
        reviewNumber:
          dto.reviewNumber ??
          generateCybersecurityReference(PRIVILEGED_ACCESS_REVIEW_NUMBER_PREFIX),
        subjectIdentityId: dto.subjectIdentityId,
        reviewerIdentityId: dto.reviewerIdentityId,
        environment: dto.environment,
        accessPurpose: dto.accessPurpose,
        approvedScope: dto.approvedScope,
        accessGrantedAt: dto.accessGrantedAt,
        accessExpiresAt: dto.accessExpiresAt,
        isSharedAdministratorAccount: dto.isSharedAdministratorAccount ?? false,
      },
    });
  }

  async revokePrivilegedAccess(id: string) {
    const review = await this.prisma.privilegedAccessReview.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Privileged access review "${id}" was not found`);
    }

    return this.prisma.privilegedAccessReview.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        status: PrivilegedAccessReviewStatus.COMPLETED,
        reviewCompletedAt: new Date(),
      },
    });
  }

  async requestBreakGlass(
    dto: CreateBreakGlassAccessEventDto,
    clientPayload: Record<string, unknown>,
  ) {
    this.boundary.rejectClientProtectedBreakGlassFields(clientPayload);

    return this.prisma.breakGlassAccessEvent.create({
      data: {
        eventNumber:
          dto.eventNumber ?? generateCybersecurityReference(BREAK_GLASS_EVENT_NUMBER_PREFIX),
        actorIdentityId: dto.actorIdentityId,
        approverIdentityId: dto.approverIdentityId,
        reason: dto.reason,
        approvedScope: dto.approvedScope,
        environment: dto.environment,
        expiresAt: dto.expiresAt,
        enhancedLoggingReference: dto.enhancedLoggingReference,
        createsInstitutionalAuthority: false,
        status: BreakGlassAccessStatus.REQUESTED,
      },
    });
  }

  async activateBreakGlass(id: string, dto: ActivateBreakGlassAccessDto) {
    const event = await this.prisma.breakGlassAccessEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Break-glass access event "${id}" was not found`);
    }

    const updated = await this.prisma.breakGlassAccessEvent.update({
      where: { id },
      data: {
        status: BreakGlassAccessStatus.ACTIVE,
        approverIdentityId: dto.approverIdentityId,
        approvedAt: new Date(),
        activatedAt: new Date(),
        enhancedLoggingReference: dto.enhancedLoggingReference,
      },
    });

    this.boundary.assertBreakGlassActive({
      status: updated.status,
      expiresAt: updated.expiresAt,
      enhancedLoggingReference: updated.enhancedLoggingReference,
      createsInstitutionalAuthority: updated.createsInstitutionalAuthority,
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.PROTECTED_ENDPOINT_ACCESS,
      identityId: updated.actorIdentityId,
      metadata: {
        breakGlassEvent: 'BREAK_GLASS_ACTIVATED',
        eventId: updated.id,
        eventNumber: updated.eventNumber,
        reason: updated.reason,
        approvedScope: updated.approvedScope,
        enhancedLoggingReference: updated.enhancedLoggingReference,
      },
    });

    return updated;
  }

  async enforceBreakGlassExpiration(now = new Date()) {
    const expired = await this.prisma.breakGlassAccessEvent.findMany({
      where: {
        status: BreakGlassAccessStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    if (expired.length === 0) {
      return { expiredCount: 0 };
    }

    await this.prisma.breakGlassAccessEvent.updateMany({
      where: { id: { in: expired.map((item) => item.id) } },
      data: { status: BreakGlassAccessStatus.EXPIRED },
    });

    return { expiredCount: expired.length };
  }

  async completeBreakGlassPostEventReview(id: string) {
    return this.prisma.breakGlassAccessEvent.update({
      where: { id },
      data: {
        postEventReviewCompleted: true,
        postEventReviewAt: new Date(),
        status: BreakGlassAccessStatus.REVIEWED,
      },
    });
  }

  async scheduleServiceIdentityReview(dto: CreateServiceIdentityReviewDto) {
    this.boundary.assertAnonymousServiceIdentityBlocked(
      dto.isAnonymousOrShared ?? false,
      dto.isConsequentialEnvironment ?? false,
    );

    return this.prisma.serviceIdentityReview.create({
      data: {
        reviewNumber:
          dto.reviewNumber ?? generateCybersecurityReference(SERVICE_IDENTITY_REVIEW_NUMBER_PREFIX),
        serviceIdentityId: dto.serviceIdentityId,
        reviewerIdentityId: dto.reviewerIdentityId,
        identityCategory: dto.identityCategory,
        isAnonymousOrShared: dto.isAnonymousOrShared ?? false,
        isConsequentialEnvironment: dto.isConsequentialEnvironment ?? false,
        scheduledAt: dto.scheduledAt,
      },
    });
  }

  async scheduleCredentialRotation(dto: CreateCredentialRotationRecordDto) {
    this.boundary.assertSecretManagerReferenceOnly(dto.secretManagerReference);
    await this.ensureCredentialExists(dto.credentialId);

    return this.prisma.credentialRotationRecord.create({
      data: {
        rotationNumber:
          dto.rotationNumber ?? generateCybersecurityReference(CREDENTIAL_ROTATION_NUMBER_PREFIX),
        credentialId: dto.credentialId,
        ownerIdentityId: dto.ownerIdentityId,
        scheduledAt: dto.scheduledAt,
        secretManagerReference: dto.secretManagerReference,
        previousReferenceRetained: dto.previousReferenceRetained ?? true,
      },
    });
  }

  async completeCredentialRotation(id: string) {
    const rotation = await this.prisma.credentialRotationRecord.findUnique({ where: { id } });
    if (!rotation) {
      throw new NotFoundException(`Credential rotation record "${id}" was not found`);
    }

    return this.prisma.credentialRotationRecord.update({
      where: { id },
      data: {
        status: CredentialRotationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async validateCredentialForUse(credentialId: string, identitySuspended = false) {
    const credential = await this.prisma.credential.findUnique({
      where: { id: credentialId },
    });
    if (!credential) {
      throw new NotFoundException(`Credential "${credentialId}" was not found`);
    }

    this.boundary.assertCredentialUsable({
      status: credential.status,
      revokedAt: credential.revokedAt,
      identitySuspended,
    });

    return credential;
  }

  async revokeSuspendedAgentCredential(credentialId: string) {
    return this.prisma.credential.update({
      where: { id: credentialId },
      data: {
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  private async ensureCredentialExists(id: string): Promise<void> {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential "${id}" was not found`);
    }
  }
}
