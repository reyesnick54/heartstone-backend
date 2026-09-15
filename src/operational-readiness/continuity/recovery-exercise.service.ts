import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BacklogPriorityBasis,
  BacklogRecoveryPlan,
  BacklogRecoveryPlanStatus,
  ContinuityCorrectiveAction,
  ContinuityCorrectiveActionSourceType,
  ContinuityCorrectiveActionStatus,
  ContinuityScenarioType,
  Prisma,
  RecoveryExercise,
  RecoveryExerciseStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  BACKLOG_PLAN_PREFIX,
  CONTINUITY_SCENARIO_TYPES,
  CORRECTIVE_ACTION_PREFIX,
  RECOVERY_EXERCISE_PREFIX,
} from '../business-continuity.constants';
import { BusinessContinuityBoundaryService } from '../common/business-continuity-boundary.service';

export interface PlanRecoveryExerciseInput {
  scenarioType: ContinuityScenarioType;
  title: string;
  description: string;
  leadIdentityId: string;
  institutionId?: string;
  plannedAt?: Date;
}

export interface CompleteRecoveryExerciseInput {
  recoveryExerciseId: string;
  success: boolean;
  representedAsGuarantee?: boolean;
}

export interface CreateBacklogRecoveryPlanInput {
  continuityEventId?: string;
  prioritizationCriteriaReference: string;
  approvedCriteriaDocumentReference: string;
  backlogItems: Prisma.InputJsonValue;
  itemPriorityBasis?: BacklogPriorityBasis;
}

@Injectable()
export class RecoveryExerciseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: BusinessContinuityBoundaryService,
  ) {}

  getArchitectureScenarioTypes(): readonly ContinuityScenarioType[] {
    return CONTINUITY_SCENARIO_TYPES;
  }

  async planExercise(input: PlanRecoveryExerciseInput): Promise<RecoveryExercise> {
    const count = await this.prisma.recoveryExercise.count();
    const exerciseReference = `${RECOVERY_EXERCISE_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.recoveryExercise.create({
      data: {
        exerciseReference,
        scenarioType: input.scenarioType,
        title: input.title,
        description: input.description,
        leadIdentityId: input.leadIdentityId,
        institutionId: input.institutionId,
        plannedAt: input.plannedAt,
        status: RecoveryExerciseStatus.PLANNED,
        isArchitectureTest: true,
        doesNotGuaranteeRecovery: true,
      },
    });
  }

  async completeExercise(input: CompleteRecoveryExerciseInput): Promise<RecoveryExercise> {
    const exercise = await this.getExerciseOrThrow(input.recoveryExerciseId);

    this.boundary.assertRecoveryExerciseNotGuarantee(
      RecoveryExerciseStatus.COMPLETED,
      input.representedAsGuarantee ?? false,
    );

    const updated = await this.prisma.recoveryExercise.update({
      where: { id: exercise.id },
      data: {
        status: input.success ? RecoveryExerciseStatus.COMPLETED : RecoveryExerciseStatus.FAILED,
        completedAt: new Date(),
      },
    });

    if (!input.success) {
      const actionCount = await this.prisma.continuityCorrectiveAction.count();
      const correctiveAction = await this.prisma.continuityCorrectiveAction.create({
        data: {
          correctiveActionReference: `${CORRECTIVE_ACTION_PREFIX}-${String(actionCount + 1).padStart(6, '0')}`,
          sourceType: ContinuityCorrectiveActionSourceType.RECOVERY_EXERCISE,
          sourceReferenceId: exercise.id,
          recoveryExerciseId: exercise.id,
          description: 'Recovery exercise failed; corrective action remains open',
          status: ContinuityCorrectiveActionStatus.OPEN,
        },
      });

      this.boundary.assertFailedRecoveryCorrectiveActionRemainsOpen(correctiveAction.status, true);
    }

    return updated;
  }

  async createBacklogRecoveryPlan(
    input: CreateBacklogRecoveryPlanInput,
  ): Promise<BacklogRecoveryPlan> {
    if (input.itemPriorityBasis) {
      this.boundary.assertBacklogCannotUseArbitraryFavoritism(
        input.itemPriorityBasis,
        input.approvedCriteriaDocumentReference,
      );
    }

    const count = await this.prisma.backlogRecoveryPlan.count();
    const planReference = `${BACKLOG_PLAN_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.backlogRecoveryPlan.create({
      data: {
        planReference,
        continuityEventId: input.continuityEventId,
        prioritizationCriteriaReference: input.prioritizationCriteriaReference,
        approvedCriteriaDocumentReference: input.approvedCriteriaDocumentReference,
        backlogItems: input.backlogItems,
        status: BacklogRecoveryPlanStatus.DRAFT,
      },
    });
  }

  assertIntegrationOutageVerificationMaintained(waiverRequested: boolean): void {
    this.boundary.assertIntegrationOutageCannotWaiveMandatoryVerification(waiverRequested);
  }

  assertInsecureFallbackBlocked(fallbackMode: string): void {
    this.boundary.assertInsecureCommunicationFallbackBlocked(fallbackMode);
  }

  assertAiCannotSubstituteRegulator(aiActorRequested: boolean): void {
    this.boundary.assertAiCannotSubstituteUnavailableRegulator(aiActorRequested);
  }

  assertSuspendedAiRequiresReauthorization(aiSuspended: boolean, reauthorized: boolean): void {
    this.boundary.assertSuspendedAiRemainsSuspendedUnlessReauthorized(aiSuspended, reauthorized);
  }

  async getExerciseOrThrow(id: string): Promise<RecoveryExercise> {
    const exercise = await this.prisma.recoveryExercise.findUnique({ where: { id } });
    if (!exercise) {
      throw new NotFoundException(`RecoveryExercise ${id} not found`);
    }
    return exercise;
  }

  async getCorrectiveActionOrThrow(id: string): Promise<ContinuityCorrectiveAction> {
    const action = await this.prisma.continuityCorrectiveAction.findUnique({ where: { id } });
    if (!action) {
      throw new NotFoundException(`ContinuityCorrectiveAction ${id} not found`);
    }
    return action;
  }
}
