import { Injectable } from '@nestjs/common';
import { LaunchEventType, LaunchGateOutcome, type LaunchReadinessSnapshot } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { LAUNCH_GATE_REQUIREMENTS } from '../production-readiness.constants';

export interface EvaluateLaunchGateInput {
  snapshotId: string;
  requirements: Record<string, boolean>;
  recordedByIdentityId: string;
  blockingDefects?: unknown[];
}

export interface LaunchGateEvaluationResult {
  gateOutcome: LaunchGateOutcome;
  unmetRequirements: string[];
  metRequirements: string[];
}

@Injectable()
export class LaunchGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async evaluateGate(input: EvaluateLaunchGateInput): Promise<LaunchGateEvaluationResult> {
    this.boundary.rejectClientGateFields(input as unknown as Record<string, unknown>);

    const snapshot = await this.prisma.launchReadinessSnapshot.findUnique({
      where: { id: input.snapshotId },
    });

    if (!snapshot) {
      throw new Error(`LaunchReadinessSnapshot ${input.snapshotId} not found`);
    }

    const blockingDefects = snapshot.knownDefects as unknown[];
    if (input.blockingDefects && input.blockingDefects.length > 0) {
      input.requirements.no_unresolved_blocking_defect = false;
    } else if (
      blockingDefects.some(
        (d) =>
          typeof d === 'object' &&
          d !== null &&
          'severity' in d &&
          (d as { severity: string }).severity === 'CRITICAL' &&
          'status' in d &&
          (d as { status: string }).status !== 'CLOSED',
      )
    ) {
      input.requirements.no_unresolved_blocking_defect = false;
    }

    const gateOutcome = this.boundary.assertLaunchGateRequirementsMet(
      input.requirements,
      LAUNCH_GATE_REQUIREMENTS,
    );

    const unmetRequirements = LAUNCH_GATE_REQUIREMENTS.filter((key) => !input.requirements[key]);
    const metRequirements = LAUNCH_GATE_REQUIREMENTS.filter((key) => input.requirements[key]);

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.GATE_EVALUATED,
        launchReadinessSnapshotId: input.snapshotId,
        description: `Launch gate evaluated: ${gateOutcome}`,
        eventData: {
          gateOutcome,
          unmetRequirements,
          metRequirements,
        },
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });

    return { gateOutcome, unmetRequirements, metRequirements };
  }

  assertReleaseMatchesSnapshot(
    snapshot: LaunchReadinessSnapshot,
    releaseCommit: string,
    artifactDigest: string,
  ): void {
    this.boundary.assertWrongDigestBlocked(snapshot.releaseCommit, releaseCommit);
    this.boundary.assertWrongDigestBlocked(snapshot.artifactDigest, artifactDigest);
  }
}
