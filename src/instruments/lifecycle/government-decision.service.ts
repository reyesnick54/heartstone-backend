import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InstrumentControllingDecision,
  InstrumentControllingDecisionStatus,
  InstrumentControllingDecisionType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateInstrumentControllingDecisionInput {
  decisionNumber: string;
  decisionType: InstrumentControllingDecisionType;
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
export class InstrumentControllingDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  async createDecision(input: CreateInstrumentControllingDecisionInput): Promise<InstrumentControllingDecision> {
    return this.prisma.instrumentControllingDecision.create({
      data: {
        decisionNumber: input.decisionNumber,
        decisionType: input.decisionType,
        status: InstrumentControllingDecisionStatus.DRAFT,
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

  async finalizeDecision(decisionId: string): Promise<InstrumentControllingDecision> {
    const decision = await this.prisma.instrumentControllingDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`InstrumentControllingDecision ${decisionId} not found`);
    }

    if (
      decision.status !== InstrumentControllingDecisionStatus.DRAFT &&
      decision.status !== InstrumentControllingDecisionStatus.PENDING
    ) {
      throw new BadRequestException('Decision is not in a finalizable state');
    }

    return this.prisma.instrumentControllingDecision.update({
      where: { id: decisionId },
      data: {
        status: InstrumentControllingDecisionStatus.FINALIZED,
        finalizedAt: new Date(),
      },
    });
  }

  async assertDecisionFinalized(decisionId: string): Promise<InstrumentControllingDecision> {
    const decision = await this.prisma.instrumentControllingDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`InstrumentControllingDecision ${decisionId} not found`);
    }

    if (decision.status !== InstrumentControllingDecisionStatus.FINALIZED) {
      throw new BadRequestException(
        'Lifecycle action requires a finalized InstrumentControllingDecision',
      );
    }

    return decision;
  }
}
