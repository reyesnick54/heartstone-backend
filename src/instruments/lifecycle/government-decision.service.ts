import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentDecision,
  GovernmentDecisionStatus,
  GovernmentDecisionType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateGovernmentDecisionInput {
  decisionNumber: string;
  decisionType: GovernmentDecisionType;
  decidingOfficeholderId: string;
  decidingIdentityId: string;
  outcomeSummary: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  governmentServiceVersionId?: string;
  authorityEvaluationRecordId?: string;
  functionAuthorityRecordId?: string;
  reasonsReference?: string;
  effectiveAt?: Date;
}

@Injectable()
export class GovernmentDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  async createDecision(input: CreateGovernmentDecisionInput): Promise<GovernmentDecision> {
    return this.prisma.governmentDecision.create({
      data: {
        decisionNumber: input.decisionNumber,
        decisionType: input.decisionType,
        status: GovernmentDecisionStatus.DRAFT,
        decidingOfficeholderId: input.decidingOfficeholderId,
        decidingIdentityId: input.decidingIdentityId,
        outcomeSummary: input.outcomeSummary,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        governmentServiceVersionId: input.governmentServiceVersionId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        reasonsReference: input.reasonsReference,
        effectiveAt: input.effectiveAt,
      },
    });
  }

  async finalizeDecision(decisionId: string): Promise<GovernmentDecision> {
    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`GovernmentDecision ${decisionId} not found`);
    }

    if (decision.status !== GovernmentDecisionStatus.DRAFT &&
        decision.status !== GovernmentDecisionStatus.PENDING) {
      throw new BadRequestException('Decision is not in a finalizable state');
    }

    return this.prisma.governmentDecision.update({
      where: { id: decisionId },
      data: {
        status: GovernmentDecisionStatus.FINALIZED,
        finalizedAt: new Date(),
      },
    });
  }

  async assertDecisionFinalized(decisionId: string): Promise<GovernmentDecision> {
    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`GovernmentDecision ${decisionId} not found`);
    }

    if (decision.status !== GovernmentDecisionStatus.FINALIZED) {
      throw new BadRequestException(
        'Lifecycle action requires a finalized GovernmentDecision',
      );
    }

    return decision;
  }
}
