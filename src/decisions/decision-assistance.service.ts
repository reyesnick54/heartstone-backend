import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DecisionAssistanceStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { hashDecisionText } from './common/decision-text-hash.util';
import { DecisionsBoundaryService } from './common/decisions-boundary.service';

export interface RecordDecisionAssistanceInput {
  governmentDecisionId: string;
  decisionReasonId?: string;
  aiModelIdentifier: string;
  modelVersion?: string;
  approvedUseCase: string;
  promptReference?: string;
  sources?: string[];
  draftOutput: string;
}

export interface ConfirmDecisionAssistanceInput {
  assistanceRecordId: string;
  humanReviewerIdentityId: string;
  humanReviewerOfficeholderId: string;
  humanModifications?: string;
  status: DecisionAssistanceStatus;
}

@Injectable()
export class DecisionAssistanceService {
  private readonly boundary = new DecisionsBoundaryService();

  constructor(private readonly prisma: PrismaService) {}

  async recordAssistance(input: RecordDecisionAssistanceInput) {
    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: input.governmentDecisionId },
    });

    if (!decision) {
      throw new NotFoundException('Government decision not found');
    }

    return this.prisma.decisionAssistanceRecord.create({
      data: {
        governmentDecisionId: input.governmentDecisionId,
        decisionReasonId: input.decisionReasonId,
        aiModelIdentifier: input.aiModelIdentifier,
        modelVersion: input.modelVersion,
        approvedUseCase: input.approvedUseCase,
        promptReference: input.promptReference,
        sources: input.sources ?? [],
        draftOutputHash: hashDecisionText(input.draftOutput),
        status: DecisionAssistanceStatus.DRAFT,
      },
    });
  }

  async confirmAssistance(input: ConfirmDecisionAssistanceInput) {
    const record = await this.prisma.decisionAssistanceRecord.findUnique({
      where: { id: input.assistanceRecordId },
    });

    if (!record) {
      throw new NotFoundException('Decision assistance record not found');
    }

    if (
      input.status === DecisionAssistanceStatus.ACCEPTED &&
      (!input.humanReviewerIdentityId || !input.humanReviewerOfficeholderId)
    ) {
      throw new ForbiddenException(
        'AI-assisted draft cannot become final institutional rationale without human reviewer attribution',
      );
    }

    return this.prisma.decisionAssistanceRecord.update({
      where: { id: record.id },
      data: {
        humanReviewerIdentityId: input.humanReviewerIdentityId,
        humanReviewerOfficeholderId: input.humanReviewerOfficeholderId,
        humanModifications: input.humanModifications,
        status: input.status,
      },
    });
  }
}
