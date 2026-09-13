import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ProfessionalOpinionStatus,
  ProfessionalSignatureSource,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateProfessionalReviewInput {
  caseId: string;
  professionType: string;
  professionalIdentityId: string;
  qualificationReference?: string;
  scopeOfEngagement: string;
  questionReviewed: string;
  methodology?: string;
  findings: string;
  limitations?: string;
  evidenceRecordIds?: string[];
  independenceDeclaration?: string;
  conflictDeclaration?: string;
}

export interface SignProfessionalReviewInput {
  reviewId: string;
  professionalIdentityId: string;
  signatureReference: string;
  signatureSource: ProfessionalSignatureSource;
  reviewDate?: Date;
  validFrom?: Date;
  validUntil?: Date;
}

@Injectable()
export class ProfessionalReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(input: CreateProfessionalReviewInput) {
    await this.assertCaseExists(input.caseId);
    await this.assertProfessionalIdentity(input.professionalIdentityId);

    return this.prisma.professionalReviewRecord.create({
      data: {
        caseId: input.caseId,
        professionType: input.professionType,
        professionalIdentityId: input.professionalIdentityId,
        qualificationReference: input.qualificationReference,
        scopeOfEngagement: input.scopeOfEngagement,
        questionReviewed: input.questionReviewed,
        methodology: input.methodology,
        findings: input.findings,
        limitations: input.limitations,
        independenceDeclaration: input.independenceDeclaration,
        conflictDeclaration: input.conflictDeclaration,
        opinionStatus: ProfessionalOpinionStatus.DRAFT,
        evidenceReviewed: input.evidenceRecordIds
          ? { create: input.evidenceRecordIds.map((id) => ({ evidenceRecordId: id })) }
          : undefined,
      },
      include: { evidenceReviewed: true },
    });
  }

  async signProfessionalOpinion(input: SignProfessionalReviewInput) {
    const review = await this.prisma.professionalReviewRecord.findUnique({
      where: { id: input.reviewId },
    });

    if (!review) {
      throw new NotFoundException('Professional review record not found');
    }

    if (review.professionalIdentityId !== input.professionalIdentityId) {
      throw new ForbiddenException('Professional record requires attributable professional identity');
    }

    if (input.signatureSource === ProfessionalSignatureSource.AI_ASSISTANCE) {
      throw new ForbiddenException('AI cannot sign a professional review record');
    }

    if (input.signatureSource !== ProfessionalSignatureSource.CONTROLLED_PROFESSIONAL_ACTION) {
      throw new ForbiddenException(
        'Professional signature must result from controlled professional action',
      );
    }

    return this.prisma.professionalReviewRecord.update({
      where: { id: input.reviewId },
      data: {
        signatureReference: input.signatureReference,
        signatureSource: input.signatureSource,
        reviewDate: input.reviewDate ?? new Date(),
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        opinionStatus: ProfessionalOpinionStatus.ISSUED,
      },
    });
  }

  assertFindingWithinScope(
    scopeOfEngagement: string,
    findings: string,
    attemptedEnforcementLanguage: boolean,
  ) {
    if (attemptedEnforcementLanguage && !scopeOfEngagement.toLowerCase().includes('enforcement')) {
      throw new BadRequestException('Professional finding cannot exceed recorded scope of engagement');
    }
    if (!findings.trim()) {
      throw new BadRequestException('Professional findings are required');
    }
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }

  private async assertProfessionalIdentity(identityId: string) {
    const identity = await this.prisma.identity.findUnique({ where: { id: identityId } });
    if (!identity) {
      throw new NotFoundException('Professional identity not found');
    }
  }
}
