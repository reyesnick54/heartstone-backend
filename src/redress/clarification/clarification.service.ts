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
  }
}
