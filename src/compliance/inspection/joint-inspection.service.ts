import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { S16_BOUNDARY_DISCLAIMERS } from '../../operational-lifecycle/operational-lifecycle.constants';

export interface AddJointInspectionParticipantInput {
  inspectionId: string;
  institutionId: string;
  departmentId?: string;
  officeholderId: string;
  identityId: string;
  functionAuthorityRecordId?: string;
  mandateSummary: string;
  participantFindings?: string;
  attributionLabel: string;
}

@Injectable()
export class JointInspectionService {
  constructor(private readonly prisma: PrismaService) {}

  coordinationBoundaryDisclaimer(): string {
    return S16_BOUNDARY_DISCLAIMERS.coordinationNotMandateExtension;
  }

  async addParticipant(input: AddJointInspectionParticipantInput) {
    const inspection = await this.prisma.inspectionRecord.findUnique({
      where: { id: input.inspectionId },
      include: { jointParticipants: true },
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection ${input.inspectionId} not found`);
    }

    if (!input.mandateSummary.trim()) {
      throw new BadRequestException('Joint inspection participant mandate must be explicit');
    }

    return this.prisma.jointInspectionParticipant.create({
      data: {
        inspectionId: input.inspectionId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        officeholderId: input.officeholderId,
        identityId: input.identityId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        mandateSummary: input.mandateSummary,
        participantFindings: input.participantFindings,
        attributionLabel: input.attributionLabel,
      },
    });
  }

  async listParticipants(inspectionId: string) {
    return this.prisma.jointInspectionParticipant.findMany({
      where: { inspectionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
