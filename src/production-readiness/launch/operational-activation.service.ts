import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IdentityType,
  LaunchEventType,
  LaunchGateOutcome,
  OperationalActivationOutcome,
  type OperationalActivationRecord,
  OperationalActivationStatus,
} from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { OPERATIONAL_ACTIVATION_BASIS } from '../production-readiness.constants';
import { LaunchGateService } from './launch-gate.service';
import { LaunchReadinessSnapshotService } from './launch-readiness-snapshot.service';

export interface OperationalActivationRequest {
  launchReadinessSnapshotId: string;
  accountableOwnerIdentityId: string;
  accountableOfficeholderId?: string;
  performedByIdentityId: string;
  performedByIdentityType: IdentityType;
  isSystemAdministrator?: boolean;
  isAiActor?: boolean;
  scopeDescription: string;
  scopeLimitations?: string[];
  acceptedReleaseCommit: string;
  acceptedArtifactDigest: string;
  activationBasis?: string;
  authorityEvaluationRecordId?: string;
  gateRequirements: Record<string, boolean>;
  acceptedScope: string[];
  requestedScope: string[];
  effectiveAt?: Date;
}

export interface OperationalActivationResult {
  outcome: OperationalActivationOutcome;
  record?: OperationalActivationRecord;
  gateOutcome: LaunchGateOutcome;
  message: string;
}

@Injectable()
export class OperationalActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly snapshotService: LaunchReadinessSnapshotService,
    private readonly gateService: LaunchGateService,
  ) {}

  async activateOperationally(
    request: OperationalActivationRequest,
  ): Promise<OperationalActivationResult> {
    this.boundary.rejectClientActivationFields(request as unknown as Record<string, unknown>);
    this.boundary.assertAiCannotActivateProduction(request.isAiActor ?? false);
    this.boundary.assertSystemAdminCannotActivateInstitutionalFunction(
      request.isSystemAdministrator ?? false,
      true,
    );
    this.boundary.assertActivationWithinScope(request.requestedScope, request.acceptedScope);

    const snapshot = await this.snapshotService.getSnapshot(request.launchReadinessSnapshotId);
    if (!this.snapshotService.verifySnapshotIntegrity(snapshot)) {
      return this.blockedResult(
        LaunchGateOutcome.BLOCKED,
        OperationalActivationOutcome.BLOCKED,
        'Launch readiness snapshot integrity verification failed',
      );
    }

    this.gateService.assertReleaseMatchesSnapshot(
      snapshot,
      request.acceptedReleaseCommit,
      request.acceptedArtifactDigest,
    );

    const gateEvaluation = await this.gateService.evaluateGate({
      snapshotId: request.launchReadinessSnapshotId,
      requirements: request.gateRequirements,
      recordedByIdentityId: request.performedByIdentityId,
    });

    if (gateEvaluation.gateOutcome !== LaunchGateOutcome.PASSED) {
      const outcome = this.boundary.mapGateOutcomeToActivationOutcome(gateEvaluation.gateOutcome);
      return this.blockedResult(gateEvaluation.gateOutcome, outcome, 'Launch gate not passed');
    }

    if (!request.accountableOwnerIdentityId) {
      return this.blockedResult(
        LaunchGateOutcome.BLOCKED,
        OperationalActivationOutcome.REQUIRES_AUTHORITY,
        'Activation requires named accountable owner',
      );
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      const activation = await tx.operationalActivationRecord.create({
        data: {
          activationNumber: generateReferenceNumber('OAR'),
          launchReadinessSnapshotId: request.launchReadinessSnapshotId,
          accountableOwnerIdentityId: request.accountableOwnerIdentityId,
          accountableOfficeholderId: request.accountableOfficeholderId,
          performedByIdentityId: request.performedByIdentityId,
          scopeDescription: request.scopeDescription,
          scopeLimitations: request.scopeLimitations ?? [],
          acceptedReleaseCommit: request.acceptedReleaseCommit,
          acceptedArtifactDigest: request.acceptedArtifactDigest,
          activationBasis: request.activationBasis ?? OPERATIONAL_ACTIVATION_BASIS.NATIONAL_LAUNCH,
          priorStatus: OperationalActivationStatus.PENDING,
          newStatus: OperationalActivationStatus.ACTIVATED,
          authorityEvaluationRecordId: request.authorityEvaluationRecordId,
          outcome: OperationalActivationOutcome.ACTIVATED,
          gateOutcome: LaunchGateOutcome.PASSED,
          effectiveAt,
        },
      });

      await tx.launchEvent.create({
        data: {
          eventType: LaunchEventType.ACTIVATION_RECORDED,
          launchReadinessSnapshotId: request.launchReadinessSnapshotId,
          description: `Operational activation ${activation.activationNumber} recorded`,
          eventData: {
            activationNumber: activation.activationNumber,
            scopeDescription: request.scopeDescription,
          },
          recordedByIdentityId: request.performedByIdentityId,
        },
      });

      return activation;
    });

    return {
      outcome: OperationalActivationOutcome.ACTIVATED,
      record,
      gateOutcome: LaunchGateOutcome.PASSED,
      message: 'Operational activation recorded via authorized launch gate pathway',
    };
  }

  async getActivation(id: string): Promise<OperationalActivationRecord> {
    const record = await this.prisma.operationalActivationRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`OperationalActivationRecord ${id} not found`);
    }
    return record;
  }

  private blockedResult(
    gateOutcome: LaunchGateOutcome,
    outcome: OperationalActivationOutcome,
    message: string,
  ): OperationalActivationResult {
    return { outcome, gateOutcome, message };
  }
}
