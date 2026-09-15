import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OperatorQualificationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { TrainingService } from '../workforce/training.service';

export interface AssertFunctionAccessInput {
  operatorQualificationId: string;
  requiredScope: string;
  functionAuthorityRecordId: string;
}

@Injectable()
export class OperatorFunctionAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly trainingService: TrainingService,
  ) {}

  async assertHighConsequenceAccess(input: AssertFunctionAccessInput): Promise<void> {
    const qualification = await this.prisma.operatorQualification.findUnique({
      where: { id: input.operatorQualificationId },
      include: {
        operationalRoleRequirement: true,
        trainingCompletions: true,
      },
    });

    if (!qualification) {
      throw new NotFoundException(`OperatorQualification ${input.operatorQualificationId} not found`);
    }

    if (qualification.functionAuthorityRecordId !== input.functionAuthorityRecordId) {
      throw new ForbiddenException(
        'Operator cannot perform outside assessed function authority record',
      );
    }

    const requirement = qualification.operationalRoleRequirement;
    const trainingExpired = this.trainingService.isTrainingExpired(qualification.trainingCompletions);

    const professionalQualificationExpired =
      requirement.professionalQualificationReference !== null &&
      (qualification.status === OperatorQualificationStatus.EXPIRED ||
        (qualification.effectiveUntil !== null &&
          qualification.effectiveUntil.getTime() < Date.now()));

    this.boundary.assertTrainingGateForHighConsequence({
      isHighConsequence: requirement.isHighConsequence,
      trainingExpired,
      professionalQualificationExpired,
    });

    this.boundary.assertHighConsequenceAccessAllowed({
      status: qualification.status,
      effectiveUntil: qualification.effectiveUntil,
      scope: qualification.scope,
      requiredScope: input.requiredScope,
      isHighConsequence: requirement.isHighConsequence,
      isAiAssessed: qualification.isAiAssessed,
    });
  }
}
