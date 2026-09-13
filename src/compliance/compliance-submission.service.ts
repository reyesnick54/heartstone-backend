import { Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceSubmissionStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface RecordComplianceSubmissionInput {
  continuingObligationId: string;
  submittedByIdentityId: string;
  evidenceRecordId?: string;
}

@Injectable()
export class ComplianceSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async recordSubmission(input: RecordComplianceSubmissionInput) {
    await this.assertObligationExists(input.continuingObligationId);
    this.boundary.assertSubmissionIsNotObligation({ treatingSubmissionAsObligation: false });

    const submission = await this.prisma.complianceSubmission.create({
      data: {
        continuingObligationId: input.continuingObligationId,
        submittedByIdentityId: input.submittedByIdentityId,
        evidenceRecordId: input.evidenceRecordId,
        status: ComplianceSubmissionStatus.RECEIVED,
        receiptAcknowledgedAt: new Date(),
      },
    });

    this.boundary.assertReceiptDoesNotSatisfyObligation({
      receiptOnly: true,
      obligationSatisfied: false,
    });

    return submission;
  }

  async acknowledgeReceipt(submissionId: string) {
    return this.prisma.complianceSubmission.update({
      where: { id: submissionId },
      data: {
        receiptAcknowledgedAt: new Date(),
        status: ComplianceSubmissionStatus.ACCEPTED_FOR_REVIEW,
      },
    });
  }

  private async assertObligationExists(continuingObligationId: string) {
    const obligation = await this.prisma.continuingObligation.findUnique({
      where: { id: continuingObligationId },
    });
    if (!obligation) {
      throw new NotFoundException(`Continuing obligation "${continuingObligationId}" was not found`);
    }
  }
}
