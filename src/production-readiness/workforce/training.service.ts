import { Injectable, NotFoundException } from '@nestjs/common';
import {
  TrainingCompletion,
  TrainingCompletionStatus,
  TrainingRequirement,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface CreateTrainingRequirementInput {
  code: string;
  name: string;
  description?: string;
  providerReference?: string;
  validityPeriodDays?: number;
  recertificationRequired?: boolean;
}

export interface RecordTrainingCompletionInput {
  operatorQualificationId: string;
  trainingRequirementId: string;
  recordedByIdentityId: string;
  providerReference?: string;
  status: TrainingCompletionStatus;
  completedAt?: Date;
  expiresAt?: Date;
  score?: number;
  evidenceReference?: string;
  isAttendanceOnly?: boolean;
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createRequirement(input: CreateTrainingRequirementInput): Promise<TrainingRequirement> {
    return this.prisma.trainingRequirement.create({
      data: {
        ...input,
        isGovernmentAuthority: false,
      },
    });
  }

  async recordCompletion(input: RecordTrainingCompletionInput): Promise<TrainingCompletion> {
    const requirement = await this.prisma.trainingRequirement.findUnique({
      where: { id: input.trainingRequirementId },
    });

    if (!requirement) {
      throw new NotFoundException(`TrainingRequirement ${input.trainingRequirementId} not found`);
    }

    this.boundary.assertAttendanceNotCompetence(input.isAttendanceOnly ?? false);

    this.boundary.assertTrainingProviderCannotSelfAssignAuthority(
      requirement.providerReference,
      requirement.isGovernmentAuthority,
      input.providerReference === requirement.providerReference,
    );

    let expiresAt = input.expiresAt;
    if (
      input.status === TrainingCompletionStatus.COMPLETED &&
      !expiresAt &&
      requirement.validityPeriodDays
    ) {
      const base = input.completedAt ?? new Date();
      expiresAt = new Date(base.getTime() + requirement.validityPeriodDays * 24 * 60 * 60 * 1000);
    }

    return this.prisma.trainingCompletion.create({
      data: {
        operatorQualificationId: input.operatorQualificationId,
        trainingRequirementId: input.trainingRequirementId,
        recordedByIdentityId: input.recordedByIdentityId,
        providerReference: input.providerReference,
        status: input.status,
        completedAt: input.completedAt,
        expiresAt,
        score: input.score,
        evidenceReference: input.evidenceReference,
        isAttendanceOnly: input.isAttendanceOnly ?? false,
      },
    });
  }

  isTrainingExpired(completions: TrainingCompletion[]): boolean {
    const now = Date.now();
    const completed = completions.filter((c) => c.status === TrainingCompletionStatus.COMPLETED);

    if (completed.length === 0) {
      return true;
    }

    return completed.some(
      (c) => c.expiresAt !== null && c.expiresAt.getTime() < now,
    );
  }
}
