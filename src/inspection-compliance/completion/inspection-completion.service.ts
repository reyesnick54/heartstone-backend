import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InspectionSessionStatus, InspectionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../boundary/inspection-compliance-boundary.service';

export interface CompleteInspectionSessionInput {
  inspectionSessionId: string;
  scopeCompleted: string;
  limitations?: string;
  areasInaccessible?: string;
  openItems?: string;
  followUpRequired?: boolean;
  reinspectionRequired?: boolean;
  referralsRequired?: boolean;
  referralsNotes?: string;
  inspectorIdentityId: string;
  inspectorOfficeholderId: string;
  reviewerIdentityId?: string;
  reviewerOfficeholderId?: string;
}

@Injectable()
export class InspectionCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionComplianceBoundaryService,
  ) {}

  async completeSession(input: CompleteInspectionSessionInput) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: input.inspectionSessionId },
      include: {
        completionRecord: true,
        findings: true,
        inspectionRecord: { include: { inspectors: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Inspection session not found');
    }

    if (session.status !== InspectionSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress sessions may be completed');
    }

    if (session.completionRecord) {
      throw new BadRequestException('Inspection session already has a completion record');
    }

    const isAssignedInspector = session.inspectionRecord.inspectors.some(
      (inspector) =>
        inspector.identityId === input.inspectorIdentityId &&
        inspector.officeholderId === input.inspectorOfficeholderId,
    );
    if (!isAssignedInspector) {
      throw new ForbiddenException(
        'Inspection completion must remain attributable to an assigned government inspector',
      );
    }

    this.boundary.assertCompletionIsNotComplianceCertification(false);

    const completedAt = new Date();

    const [completionRecord] = await this.prisma.$transaction([
      this.prisma.inspectionCompletionRecord.create({
        data: {
          inspectionSessionId: input.inspectionSessionId,
          scopeCompleted: input.scopeCompleted,
          limitations: input.limitations,
          areasInaccessible: input.areasInaccessible,
          openItems: input.openItems,
          followUpRequired: input.followUpRequired ?? false,
          reinspectionRequired: input.reinspectionRequired ?? false,
          referralsRequired: input.referralsRequired ?? false,
          referralsNotes: input.referralsNotes,
          constitutesComplianceCertification: false,
          completedAt,
          inspectorIdentityId: input.inspectorIdentityId,
          inspectorOfficeholderId: input.inspectorOfficeholderId,
          reviewerIdentityId: input.reviewerIdentityId,
          reviewerOfficeholderId: input.reviewerOfficeholderId,
        },
      }),
      this.prisma.inspectionSession.update({
        where: { id: input.inspectionSessionId },
        data: { status: InspectionSessionStatus.COMPLETED },
      }),
      this.prisma.inspectionRecord.update({
        where: { id: session.inspectionRecordId },
        data: {
          status: InspectionStatus.COMPLETED,
          limitations: input.limitations,
          followUpRequired: input.followUpRequired ?? false,
        },
      }),
    ]);

    return {
      completionRecord,
      findingsSummary: session.findings.map((finding) => ({
        id: finding.id,
        findingNumber: finding.findingNumber,
        status: finding.status,
        severity: finding.severity,
      })),
      suspendsInstrument: false,
    };
  }

  assertDoesNotSuspendInstrument(): void {
    this.boundary.assertCompletionDoesNotSuspendInstrument();
  }
}
