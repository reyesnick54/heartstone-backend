import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplaintEvidenceAccessLevel,
  ComplaintEvidenceType,
  ComplaintInvestigationIssueStatus,
  ComplaintInvestigationStatus,
  ComplaintPathwayScope,
  ComplaintStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface OpenComplaintInvestigationInput {
  complaintId: string;
  leadInvestigatorIdentityId: string;
  scopeSummary: string;
  partiesSummary?: string;
  limitationsSummary?: string;
  conflictNotes?: string;
}

export interface AddInvestigationIssueInput {
  investigationId: string;
  issueSummary: string;
  pathwayScope?: ComplaintPathwayScope;
}

export interface AddInvestigationEvidenceInput {
  investigationId: string;
  evidenceType: ComplaintEvidenceType;
  description: string;
  sourceReference?: string;
  accessLevel?: ComplaintEvidenceAccessLevel;
}

@Injectable()
export class ComplaintInvestigationService {
  constructor(private readonly prisma: PrismaService) {}

  async open(input: OpenComplaintInvestigationInput) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: input.complaintId } });
    if (!complaint) {
      throw new NotFoundException(`Complaint ${input.complaintId} not found`);
    }

    const investigation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complaintInvestigation.create({
        data: {
          complaintId: input.complaintId,
          leadInvestigatorIdentityId: input.leadInvestigatorIdentityId,
          scopeSummary: input.scopeSummary,
          partiesSummary: input.partiesSummary,
          limitationsSummary: input.limitationsSummary,
          conflictNotes: input.conflictNotes,
          status: ComplaintInvestigationStatus.IN_PROGRESS,
        },
      });

      await tx.complaint.update({
        where: { id: input.complaintId },
        data: { status: ComplaintStatus.UNDER_INVESTIGATION },
      });

      return created;
    });

    return investigation;
  }

  async addIssue(input: AddInvestigationIssueInput) {
    await this.requireInvestigation(input.investigationId);

    return this.prisma.complaintInvestigationIssue.create({
      data: {
        investigationId: input.investigationId,
        issueSummary: input.issueSummary,
        pathwayScope: input.pathwayScope ?? ComplaintPathwayScope.COMPLAINT,
        status: ComplaintInvestigationIssueStatus.OPEN,
      },
    });
  }

  async addEvidence(input: AddInvestigationEvidenceInput) {
    await this.requireInvestigation(input.investigationId);

    if (!input.description.trim()) {
      throw new BadRequestException('Investigation evidence requires a description');
    }

    return this.prisma.complaintInvestigationEvidence.create({
      data: {
        investigationId: input.investigationId,
        evidenceType: input.evidenceType,
        description: input.description,
        sourceReference: input.sourceReference,
        accessLevel: input.accessLevel ?? ComplaintEvidenceAccessLevel.MINIMUM_NECESSARY,
        minimumNecessary: true,
      },
    });
  }

  async complete(investigationId: string) {
    const investigation = await this.requireInvestigation(investigationId);

    return this.prisma.complaintInvestigation.update({
      where: { id: investigation.id },
      data: {
        status: ComplaintInvestigationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  private async requireInvestigation(investigationId: string) {
    const investigation = await this.prisma.complaintInvestigation.findUnique({
      where: { id: investigationId },
    });

    if (!investigation) {
      throw new NotFoundException(`ComplaintInvestigation ${investigationId} not found`);
    }

    return investigation;
  }
}
