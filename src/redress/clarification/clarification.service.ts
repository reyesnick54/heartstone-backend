import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClarificationRequestStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CLARIFICATION_REQUEST_NUMBER_PREFIX } from '../redress.constants';
import {
  ClarificationBoundaryService,
  type ClarificationResponseDraft,
} from './clarification-boundary.service';

export interface FileClarificationRequestInput {
  requesterIdentityId: string;
  requestedSubject: string;
  clarificationQuestion: string;
  relatedDecisionId?: string;
  relatedInstrumentId?: string;
  relatedNoticeReference?: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
}

export interface RespondToClarificationInput extends ClarificationResponseDraft {
  clarificationRequestId: string;
  responderIdentityId: string;
  responderOfficeholderId?: string;
  authorityEvaluationRecordId?: string;
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
    private readonly boundaryService: ClarificationBoundaryService,
  ) {}

  async fileRequest(input: FileClarificationRequestInput) {
    const requestNumber = `${CLARIFICATION_REQUEST_NUMBER_PREFIX}-${String(Date.now())}`;

    return this.prisma.clarificationRequest.create({
      data: {
        requestNumber,
        requesterIdentityId: input.requesterIdentityId,
        requestedSubject: input.requestedSubject,
        clarificationQuestion: input.clarificationQuestion,
        relatedDecisionId: input.relatedDecisionId,
        relatedInstrumentId: input.relatedInstrumentId,
        relatedNoticeReference: input.relatedNoticeReference,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        status: ClarificationRequestStatus.REQUESTED,
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
      where: { id: input.clarificationRequestId },
    });

    if (!request) {
      throw new NotFoundException(`ClarificationRequest ${input.clarificationRequestId} not found`);
    }

    if (request.status === ClarificationRequestStatus.REJECTED) {
      throw new ForbiddenException('Cannot respond to a rejected clarification request');
    }

    this.boundaryService.assertResponseWithinBounds(input);

    const response = await this.prisma.clarificationResponse.create({
      data: {
        clarificationRequestId: input.clarificationRequestId,
        responderIdentityId: input.responderIdentityId,
        responderOfficeholderId: input.responderOfficeholderId,
        responseContent: input.responseContent,
        proceduralExplanation: input.proceduralExplanation,
        referencedRequirement: input.referencedRequirement,
        applicableDeadline: input.applicableDeadline,
        availableRoutes: input.availableRoutes ?? [],
        displayedDataExplanation: input.displayedDataExplanation,
        recordAccessGuidance: input.recordAccessGuidance,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      },
    });

    await this.prisma.clarificationRequest.update({
      where: { id: input.clarificationRequestId },
      data: { status: ClarificationRequestStatus.RESPONDED },
    });

    return response;
  }

  async findById(requestId: string) {
    const request = await this.prisma.clarificationRequest.findUnique({
      where: { id: requestId },
      include: { responses: true },
    });

    if (!request) {
      throw new NotFoundException(`ClarificationRequest ${requestId} not found`);
    }

    return request;
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
