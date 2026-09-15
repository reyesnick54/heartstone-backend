import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LaunchEventType,
  type OperationalRevalidation,
  OperationalRevalidationOutcome,
  OperationalRevalidationTrigger,
  type OperationalSuspension,
  OperationalSuspensionScope,
  OperationalSuspensionStatus,
  Prisma,
} from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

@Injectable()
export class OperationalSuspensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async issueSuspension(input: {
    scope: OperationalSuspensionScope;
    targetReference: string;
    reason: string;
    suspendedByIdentityId: string;
    authorityEvaluationRecordId?: string;
    suspensionEffects?: Record<string, unknown>;
    revokedCredentialRefs?: string[];
    disabledIntegrationRefs?: string[];
    preserveRecords?: boolean;
    preserveAudit?: boolean;
    preserveAppealsAccess?: boolean;
  }): Promise<OperationalSuspension> {
    this.boundary.rejectClientSuspensionFields(input);

    const suspension = await this.prisma.operationalSuspension.create({
      data: {
        suspensionNumber: generateReferenceNumber('SUSP'),
        scope: input.scope,
        targetReference: input.targetReference,
        reason: input.reason,
        suspendedByIdentityId: input.suspendedByIdentityId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        suspensionEffects: (input.suspensionEffects ?? {}) as Prisma.InputJsonValue,
        revokedCredentialRefs: input.revokedCredentialRefs ?? [],
        disabledIntegrationRefs: input.disabledIntegrationRefs ?? [],
        preserveRecords: input.preserveRecords ?? true,
        preserveAudit: input.preserveAudit ?? true,
        preserveAppealsAccess: input.preserveAppealsAccess ?? true,
        status: OperationalSuspensionStatus.ACTIVE,
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.SUSPENSION_ISSUED,
        description: `Operational suspension ${suspension.suspensionNumber} issued for ${input.scope}:${input.targetReference}`,
        eventData: {
          suspensionNumber: suspension.suspensionNumber,
          scope: input.scope,
          targetReference: input.targetReference,
        },
        recordedByIdentityId: input.suspendedByIdentityId,
      },
    });

    return suspension;
  }

  async liftSuspension(input: {
    suspensionId: string;
    liftedByIdentityId: string;
  }): Promise<OperationalSuspension> {
    const existing = await this.prisma.operationalSuspension.findUnique({
      where: { id: input.suspensionId },
    });
    if (!existing) {
      throw new NotFoundException(`OperationalSuspension ${input.suspensionId} not found`);
    }
    if (existing.status !== OperationalSuspensionStatus.ACTIVE) {
      throw new BadRequestException('Suspension is not active');
    }

    const suspension = await this.prisma.operationalSuspension.update({
      where: { id: input.suspensionId },
      data: {
        status: OperationalSuspensionStatus.LIFTED,
        liftedAt: new Date(),
        liftedByIdentityId: input.liftedByIdentityId,
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.SUSPENSION_LIFTED,
        description: `Operational suspension ${suspension.suspensionNumber} lifted`,
        eventData: { suspensionNumber: suspension.suspensionNumber },
        recordedByIdentityId: input.liftedByIdentityId,
      },
    });

    return suspension;
  }

  isTargetSuspended(
    scope: OperationalSuspensionScope,
    targetReference: string,
    activeSuspensions: OperationalSuspension[],
  ): boolean {
    return activeSuspensions.some(
      (s) =>
        s.status === OperationalSuspensionStatus.ACTIVE &&
        (s.scope === OperationalSuspensionScope.ENTIRE_PLATFORM ||
          (s.scope === scope && s.targetReference === targetReference)),
    );
  }

  async getActiveSuspensionsForTarget(
    scope: OperationalSuspensionScope,
    targetReference: string,
  ): Promise<OperationalSuspension[]> {
    return this.prisma.operationalSuspension.findMany({
      where: {
        status: OperationalSuspensionStatus.ACTIVE,
        OR: [{ scope: OperationalSuspensionScope.ENTIRE_PLATFORM }, { scope, targetReference }],
      },
    });
  }
}

@Injectable()
export class OperationalRevalidationService {
  constructor(private readonly prisma: PrismaService) {}

  async requireRevalidation(input: {
    triggerReason: OperationalRevalidationTrigger;
    triggerDescription: string;
    targetCapabilityRef: string;
    scopeDescription: string;
    requiredBy?: Date;
    recordedByIdentityId: string;
  }): Promise<OperationalRevalidation> {
    const revalidation = await this.prisma.operationalRevalidation.create({
      data: {
        revalidationNumber: generateReferenceNumber('REVAL'),
        triggerReason: input.triggerReason,
        triggerDescription: input.triggerDescription,
        targetCapabilityRef: input.targetCapabilityRef,
        scopeDescription: input.scopeDescription,
        requiredBy: input.requiredBy,
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.REVALIDATION_REQUIRED,
        description: `Revalidation required for ${input.targetCapabilityRef}: ${input.triggerReason}`,
        eventData: {
          revalidationNumber: revalidation.revalidationNumber,
          triggerReason: input.triggerReason,
        },
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    return revalidation;
  }

  async completeRevalidation(input: {
    revalidationId: string;
    outcome: OperationalRevalidationOutcome;
    outcomeNotes: string;
    conductedByIdentityId: string;
    authorityEvaluationRecordId?: string;
  }): Promise<OperationalRevalidation> {
    const revalidation = await this.prisma.operationalRevalidation.update({
      where: { id: input.revalidationId },
      data: {
        outcome: input.outcome,
        outcomeNotes: input.outcomeNotes,
        conductedByIdentityId: input.conductedByIdentityId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        completedAt: new Date(),
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.REVALIDATION_COMPLETED,
        description: `Revalidation ${revalidation.revalidationNumber} completed: ${input.outcome}`,
        eventData: {
          revalidationNumber: revalidation.revalidationNumber,
          outcome: input.outcome,
        },
        recordedByIdentityId: input.conductedByIdentityId,
      },
    });

    return revalidation;
  }
}
