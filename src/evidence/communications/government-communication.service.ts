import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentCommunicationAuthenticationStatus,
  GovernmentCommunicationCategory,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  GOVERNMENT_COMMUNICATION_CONSEQUENCE_CATEGORIES,
  GOVERNMENT_COMMUNICATION_NON_APPROVAL_CATEGORIES,
} from '../evidence.constants';

export interface RecordGovernmentCommunicationInput {
  caseId: string;
  category: GovernmentCommunicationCategory;
  sourceInstitutionId: string;
  officialReference?: string;
  senderReference?: string;
  recipientReference?: string;
  receivedAt?: Date;
  sentAt?: Date;
  authenticationStatus?: GovernmentCommunicationAuthenticationStatus;
  scope?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  limitations?: string;
  documentRecordIds?: string[];
  evidenceRecordIds?: string[];
  caseReferralId?: string;
  retainedDeterminationForExternalAuthorityId?: string;
}

@Injectable()
export class GovernmentCommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordGovernmentCommunicationInput) {
    await this.assertCaseExists(input.caseId);
    this.assertCategorySemantics(input.category);

    if (input.category === GovernmentCommunicationCategory.RETAINED_DETERMINATION) {
      await this.validateRetainedDetermination(input);
    }

    if (
      GOVERNMENT_COMMUNICATION_CONSEQUENCE_CATEGORIES.includes(
        input.category as (typeof GOVERNMENT_COMMUNICATION_CONSEQUENCE_CATEGORIES)[number],
      ) &&
      input.authenticationStatus !== GovernmentCommunicationAuthenticationStatus.AUTHENTICATED
    ) {
      throw new ForbiddenException(
        'Consequential government communication categories require authenticated status',
      );
    }

    return this.prisma.governmentCommunicationRecord.create({
      data: {
        caseId: input.caseId,
        category: input.category,
        sourceInstitutionId: input.sourceInstitutionId,
        officialReference: input.officialReference,
        senderReference: input.senderReference,
        recipientReference: input.recipientReference,
        receivedAt: input.receivedAt,
        sentAt: input.sentAt,
        authenticationStatus:
          input.authenticationStatus ?? GovernmentCommunicationAuthenticationStatus.UNAUTHENTICATED,
        scope: input.scope,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        limitations: input.limitations,
        caseReferralId: input.caseReferralId,
        retainedDeterminationForExternalAuthorityId: input.retainedDeterminationForExternalAuthorityId,
        documentRecords: input.documentRecordIds
          ? { create: input.documentRecordIds.map((id) => ({ documentRecordId: id })) }
          : undefined,
        evidenceRecords: input.evidenceRecordIds
          ? { create: input.evidenceRecordIds.map((id) => ({ evidenceRecordId: id })) }
          : undefined,
      },
      include: { documentRecords: true, evidenceRecords: true },
    });
  }

  isApprovalEquivalent(category: GovernmentCommunicationCategory): boolean {
    return !GOVERNMENT_COMMUNICATION_NON_APPROVAL_CATEGORIES.includes(
      category as (typeof GOVERNMENT_COMMUNICATION_NON_APPROVAL_CATEGORIES)[number],
    );
  }

  assertAcknowledgmentIsNotApproval(category: GovernmentCommunicationCategory) {
    if (category === GovernmentCommunicationCategory.ACKNOWLEDGMENT) {
      return { constitutesApproval: false, constitutesConcurrence: false };
    }
    return null;
  }

  assertSilenceIsNotConcurrence(recordExists: boolean) {
    if (!recordExists) {
      return { constitutesConcurrence: false };
    }
    return null;
  }

  assertConsultationIsNotConcurrence(category: GovernmentCommunicationCategory) {
    if (category === GovernmentCommunicationCategory.CONSULTATION) {
      return { constitutesConcurrence: false };
    }
    return null;
  }

  private assertCategorySemantics(category: GovernmentCommunicationCategory) {
    if (category === GovernmentCommunicationCategory.RECEIPT) {
      return;
    }
    if (category === GovernmentCommunicationCategory.ACKNOWLEDGMENT) {
      return;
    }
  }

  private async validateRetainedDetermination(input: RecordGovernmentCommunicationInput) {
    if (!input.caseReferralId || !input.retainedDeterminationForExternalAuthorityId) {
      throw new BadRequestException(
        'Retained determination requires linked referral and designated external authority',
      );
    }

    const referral = await this.prisma.caseReferral.findUnique({
      where: { id: input.caseReferralId },
    });

    if (!referral) {
      throw new NotFoundException('Case referral not found for retained determination');
    }

    if (referral.externalAuthorityId !== input.retainedDeterminationForExternalAuthorityId) {
      throw new ForbiddenException(
        'Wrong external institution cannot satisfy retained determination requirement',
      );
    }

    if (referral.institutionId && referral.institutionId === input.sourceInstitutionId) {
      throw new ForbiddenException(
        'Retained determination must come from the competent external authority, not the referring institution alone',
      );
    }
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
