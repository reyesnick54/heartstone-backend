import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InstrumentLifecycleDecision,
  InstrumentLifecycleDecisionStatus,
  InstrumentLifecycleDecisionType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateInstrumentLifecycleDecisionInput {
  decisionNumber: string;
  decisionType: InstrumentLifecycleDecisionType;
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

  async createDecision(
    input: CreateInstrumentLifecycleDecisionInput,
  ): Promise<InstrumentLifecycleDecision> {
    return this.prisma.instrumentLifecycleDecision.create({
      data: {
        decisionNumber: input.decisionNumber,
        decisionType: input.decisionType,
        status: InstrumentLifecycleDecisionStatus.DRAFT,
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

  async finalizeDecision(decisionId: string): Promise<InstrumentLifecycleDecision> {
    const decision = await this.prisma.instrumentLifecycleDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`InstrumentLifecycleDecision ${decisionId} not found`);
    }

    if (
      decision.status !== InstrumentLifecycleDecisionStatus.DRAFT &&
      decision.status !== InstrumentLifecycleDecisionStatus.PENDING
    ) {
      throw new BadRequestException('Decision is not in a finalizable state');
    }

    return this.prisma.instrumentLifecycleDecision.update({
      where: { id: decisionId },
      data: {
        status: InstrumentLifecycleDecisionStatus.FINALIZED,
        finalizedAt: new Date(),
      },
    });
  }

  async assertDecisionFinalized(decisionId: string): Promise<InstrumentLifecycleDecision> {
    const decision = await this.prisma.instrumentLifecycleDecision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`InstrumentLifecycleDecision ${decisionId} not found`);
    }

    if (decision.status !== InstrumentLifecycleDecisionStatus.FINALIZED) {
      throw new BadRequestException(
        'Lifecycle action requires a finalized InstrumentLifecycleDecision',
      );
    }

    return decision;
  }
}
