import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InspectionFindingStatus, InspectionResponseType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../boundary/inspection-compliance-boundary.service';

export interface RecordInspectionResponseInput {
  inspectionSessionId: string;
  responderIdentityId: string;
  responseType: InspectionResponseType;
  inspectionFindingId?: string;
  inspectionObservationId?: string;
  comments?: string;
  disputedFacts?: string;
  correction?: string;
  context?: string;
  supportingEvidenceRecordIds?: string[];
}

@Injectable()
export class InspectionResponseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionComplianceBoundaryService,
  ) {}

  async recordResponse(input: RecordInspectionResponseInput) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: input.inspectionSessionId },
    });
    if (!session) {
      throw new NotFoundException('Inspection session not found');
    }

    if (!input.inspectionFindingId && !input.inspectionObservationId && !input.comments) {
      throw new BadRequestException(
        'Subject response must target a finding or observation, or provide session comments',
      );
    }

    this.boundary.assertResponseDoesNotOverwriteOriginal();

    const response = await this.prisma.inspectionResponse.create({
      data: {
        inspectionSessionId: input.inspectionSessionId,
        inspectionFindingId: input.inspectionFindingId,
        inspectionObservationId: input.inspectionObservationId,
        responderIdentityId: input.responderIdentityId,
        responseType: input.responseType,
        comments: input.comments,
        disputedFacts: input.disputedFacts,
        correction: input.correction,
        context: input.context,
        supportingEvidence: input.supportingEvidenceRecordIds?.length
          ? {
              create: input.supportingEvidenceRecordIds.map((evidenceRecordId) => ({
                evidenceRecordId,
              })),
            }
          : undefined,
      },
      include: { supportingEvidence: true },
    });

    if (
      input.inspectionObservationId &&
      input.responseType === InspectionResponseType.DISPUTED_FACTS
    ) {
      await this.prisma.inspectionObservation.update({
        where: { id: input.inspectionObservationId },
        data: { disputedBySubject: true },
      });
    }

    if (input.inspectionFindingId && input.responseType === InspectionResponseType.DISPUTED_FACTS) {
      await this.prisma.inspectionFinding.update({
        where: { id: input.inspectionFindingId },
        data: { status: InspectionFindingStatus.DISPUTED },
      });
    }

    return response;
  }
}
