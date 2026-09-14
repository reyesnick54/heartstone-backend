import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface CreateClarificationRequestInput {
  matterId: string;
  questionSummary: string;
  altersSubstantiveDecision?: boolean;
}

export interface RespondToClarificationInput {
  requestId: string;
  responseSummary: string;
}

@Injectable()
export class ClarificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createRequest(input: CreateClarificationRequestInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'clarification request');

    this.boundary.assertClarificationNotSubstantive(input.altersSubstantiveDecision ?? false);

    return this.prisma.clarificationRequest.create({
      data: {
        matterId: input.matterId,
        questionSummary: input.questionSummary,
        altersSubstantiveDecision: input.altersSubstantiveDecision ?? false,
      },
    });
  }

  async respond(input: RespondToClarificationInput) {
    const request = await this.prisma.clarificationRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request) {
      throw new NotFoundException(`ClarificationRequest ${input.requestId} not found`);
    }

    if (request.altersSubstantiveDecision) {
      throw new BadRequestException('Clarification cannot alter substantive decision');
    }

    await this.safeHalt.assertMatterNotSafeHalted(request.matterId, 'clarification response');

    return this.prisma.clarificationResponse.create({
      data: {
        requestId: input.requestId,
        responseSummary: input.responseSummary,
      },
    });
  }
}
