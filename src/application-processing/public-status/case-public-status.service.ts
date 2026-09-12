import { Injectable } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

const PUBLIC_STATUS_LABELS: Partial<Record<CaseStatus, string>> = {
  RECEIVED: 'Application received',
  INTAKE: 'Under intake review',
  COMPLETENESS_REVIEW: 'Completeness review in progress',
  WAITING_APPLICANT: 'Additional information required',
  SUBSTANTIVE_REVIEW: 'Under substantive review',
  PENDING_EXTERNAL: 'Awaiting external authority response',
  PENDING_INTERNAL: 'Under internal coordination',
  DECISION_PENDING: 'Pending final decision',
  SAFE_HALTED: 'Processing paused for review',
  SUSPENDED: 'Service temporarily suspended',
};

@Injectable()
export class CasePublicStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async project(caseId: string, sourceCaseStatus: CaseStatus) {
    const publicStatusLabel = PUBLIC_STATUS_LABELS[sourceCaseStatus] ?? 'Application in progress';

    return this.prisma.casePublicStatusProjection.upsert({
      where: { caseId },
      create: {
        caseId,
        publicStatusLabel,
        sourceCaseStatus,
        publicMessage: 'This status is informational only and does not constitute a decision.',
      },
      update: {
        publicStatusLabel,
        sourceCaseStatus,
        lastUpdatedAt: new Date(),
      },
    });
  }

  async getApplicantView(caseId: string, applicantIdentityId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        application: true,
        publicStatusProjection: true,
        communications: { where: { visibility: 'APPLICANT' }, orderBy: { createdAt: 'desc' } },
        milestones: { orderBy: { reachedAt: 'asc' } },
      },
    });

    if (caseRecord?.application.applicantIdentityId !== applicantIdentityId) {
      return null;
    }

    const internalNotes = await this.prisma.caseCommunication.count({
      where: { caseId, visibility: 'INTERNAL' },
    });

    return {
      caseNumber: caseRecord.caseNumber,
      publicStatus: caseRecord.publicStatusProjection,
      milestones: caseRecord.milestones,
      communications: caseRecord.communications,
      internalNoteCountExcluded: internalNotes,
    };
  }
}
