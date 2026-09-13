import { Injectable, NotFoundException } from '@nestjs/common';
import { type DecisionPreparationRecord, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PHASE_8B_BOUNDARY_DISCLAIMER } from '../decisions.constants';

export interface CreateDecisionPreparationInput {
  caseId: string;
  decisionTypeVersionId: string;
  editorIdentityId: string;
  proposedFindings?: string;
  proposedReasons?: string;
  proposedOutcome?: string;
  recommendation?: string;
  aiAssistanceMetadata?: Record<string, unknown>;
}

@Injectable()
export class DecisionPreparationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDecisionPreparationInput): Promise<DecisionPreparationRecord> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    const decisionTypeVersion = await this.prisma.decisionTypeVersion.findUnique({
      where: { id: input.decisionTypeVersionId },
    });
    if (!decisionTypeVersion) {
      throw new NotFoundException(
        `DecisionTypeVersion "${input.decisionTypeVersionId}" was not found`,
      );
    }

    const record = await this.prisma.decisionPreparationRecord.create({
      data: {
        caseId: input.caseId,
        decisionTypeVersionId: input.decisionTypeVersionId,
        editorIdentityId: input.editorIdentityId,
        proposedFindings: input.proposedFindings,
        proposedReasons: input.proposedReasons,
        proposedOutcome: input.proposedOutcome,
        recommendation: input.recommendation,
        aiAssistanceMetadata: (input.aiAssistanceMetadata ?? {}) as Prisma.InputJsonValue,
        isNonFinal: true,
      },
    });

    return Object.assign(record, {
      boundaryDisclaimer: PHASE_8B_BOUNDARY_DISCLAIMER,
      isOfficialDecision: false,
    });
  }
}
