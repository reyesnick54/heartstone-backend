import { Injectable, NotFoundException } from '@nestjs/common';
import { ComplaintEvidenceAccessLevel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplaintBoundaryService } from './complaint-boundary.service';

@Injectable()
export class ComplaintPublicViewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplaintBoundaryService,
  ) {}

  async getApplicantView(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        responses: { where: { isPublic: true }, orderBy: { issuedAt: 'desc' } },
        closure: true,
        investigations: {
          include: {
            evidence: true,
            issues: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    for (const investigation of complaint.investigations) {
      for (const evidence of investigation.evidence) {
        if (evidence.accessLevel !== ComplaintEvidenceAccessLevel.MINIMUM_NECESSARY) {
          this.boundary.assertRestrictedInvestigationMaterialNotPublic({
            accessLevel: evidence.accessLevel,
            exposePrivilegedNotes: false,
          });
        }
      }
    }

    return {
      complaintNumber: complaint.complaintNumber,
      status: complaint.status,
      acknowledgedAt: complaint.acknowledgedAt,
      subjectSummary: complaint.subjectSummary,
      publicResponses: complaint.responses.map((response) => ({
        responseSummary: response.responseSummary,
        issuedAt: response.issuedAt,
      })),
      closure: complaint.closure
        ? {
            closureReason: complaint.closure.closureReason,
            closureSummary: complaint.closure.closureSummary,
            furtherRedressSummary: complaint.closure.furtherRedressSummary,
            closedAt: complaint.closure.closedAt,
          }
        : null,
      investigationNotesExcluded: true,
      privilegedEvidenceExcluded: true,
    };
  }
}
