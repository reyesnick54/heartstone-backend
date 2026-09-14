import { BadRequestException, Injectable } from '@nestjs/common';
import { ReviewEvidenceClassification, ReviewProceedingKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  REDRESS_REASON_CODES,
  REVIEW_EVIDENCE_ADMISSION_NUMBER_PREFIX,
} from '../redress.constants';

export interface AdmitReviewEvidenceInput {
  proceedingKind: ReviewProceedingKind;
  reconsiderationProceedingId?: string;
  internalAdministrativeReviewId?: string;
  evidenceReference: string;
  classification: ReviewEvidenceClassification;
  admittedByIdentityId: string;
  admissionNotes?: string;
  isPostDecision?: boolean;
}

@Injectable()
export class ReviewEvidenceAdmissionService {
  constructor(private readonly prisma: PrismaService) {}

  async admitEvidence(input: AdmitReviewEvidenceInput) {
    if (input.isPostDecision && input.classification !== ReviewEvidenceClassification.POST_DECISION_EVIDENCE) {
      throw new BadRequestException(REDRESS_REASON_CODES.POST_DECISION_EVIDENCE_REQUIRED_LABEL);
    }

    const admissionNumber = await this.generateAdmissionNumber();

    return this.prisma.reviewEvidenceAdmission.create({
      data: {
        admissionNumber,
        proceedingKind: input.proceedingKind,
        reconsiderationProceedingId: input.reconsiderationProceedingId,
        internalAdministrativeReviewId: input.internalAdministrativeReviewId,
        evidenceReference: input.evidenceReference,
        classification: input.classification,
        admittedByIdentityId: input.admittedByIdentityId,
        admissionNotes: input.admissionNotes,
      },
    });
  }

  private async generateAdmissionNumber(): Promise<string> {
    const count = await this.prisma.reviewEvidenceAdmission.count();
    return `${REVIEW_EVIDENCE_ADMISSION_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
