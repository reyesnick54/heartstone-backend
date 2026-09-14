import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  EnforcementReferralStatus,
  RetainedEnforcementAuthorityClass,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { assertComplianceAuthority } from '../common/compliance-authority.guard';
import { buildComplianceNumber } from '../common/compliance-number.util';
import {
  ENFORCEMENT_REFERRAL_NUMBER_PREFIX,
  REFERRAL_NOT_GOVERNMENT_DECISION_MESSAGE,
  REFERRAL_NOT_PROSECUTION_MESSAGE,
  RETAINED_NATIONAL_AUTHORITY_MESSAGE,
} from '../inspection-compliance.constants';

export interface CreateEnforcementReferralInput {
  caseId: string;
  matter: string;
  competentAuthority: string;
  externalAuthorityId?: string;
  authorityPurpose: string;
  facts: string;
  evidencePacketId?: string;
  questionsRequest?: string;
  securityClassification?: string;
  retainedAuthorityClass?: RetainedEnforcementAuthorityClass;
  referredByIdentityId: string;
  referredByOfficeholderId?: string;
  functionAuthorityRecordId: string;
}

export interface SendEnforcementReferralInput {
  referralId: string;
  sentByIdentityId: string;
  sentByOfficeholderId?: string;
  functionAuthorityRecordId: string;
}

@Injectable()
export class EnforcementReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async create(input: CreateEnforcementReferralInput) {
    await this.assertCaseExists(input.caseId);
    const sequence = await this.prisma.enforcementReferral.count();
    const referralNumber = buildComplianceNumber(ENFORCEMENT_REFERRAL_NUMBER_PREFIX, sequence + 1);

    const retainsNationalAuthority = this.isRetainedAuthority(input.retainedAuthorityClass);

    return this.prisma.enforcementReferral.create({
      data: {
        referralNumber,
        caseId: input.caseId,
        matter: input.matter,
        competentAuthority: input.competentAuthority,
        externalAuthorityId: input.externalAuthorityId,
        authorityPurpose: input.authorityPurpose,
        facts: input.facts,
        evidencePacketId: input.evidencePacketId,
        questionsRequest: input.questionsRequest,
        securityClassification: input.securityClassification,
        retainedAuthorityClass: input.retainedAuthorityClass,
        retainsNationalAuthority,
        status: EnforcementReferralStatus.DRAFT,
        referredByIdentityId: input.referredByIdentityId,
        referredByOfficeholderId: input.referredByOfficeholderId,
      },
    });
  }

  async send(input: SendEnforcementReferralInput) {
    const referral = await this.prisma.enforcementReferral.findUnique({
      where: { id: input.referralId },
    });
    if (!referral) {
      throw new NotFoundException('Enforcement referral not found');
    }

    const authorityEvaluationRecordId = await assertComplianceAuthority(this.authorityEvaluation, {
      identityId: input.sentByIdentityId,
      officeholderId: input.sentByOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.LIAISE,
    });

    return this.prisma.enforcementReferral.update({
      where: { id: input.referralId },
      data: {
        status: EnforcementReferralStatus.SENT,
        sentAt: new Date(),
        authorityEvaluationRecordId,
      },
    });
  }

  isRetainedAuthority(retainedAuthorityClass?: RetainedEnforcementAuthorityClass | null): boolean {
    if (!retainedAuthorityClass) {
      return false;
    }
    return [
      RetainedEnforcementAuthorityClass.CRIMINAL,
      RetainedEnforcementAuthorityClass.NATIONAL_REGULATORY,
      RetainedEnforcementAuthorityClass.BORDER_CUSTOMS,
      RetainedEnforcementAuthorityClass.JUDICIAL,
      RetainedEnforcementAuthorityClass.OTHER_RETAINED,
    ].includes(retainedAuthorityClass);
  }

  referralIsProsecution(): boolean {
    return false;
  }

  referralIsGovernmentDecision(): boolean {
    return false;
  }

  referralBoundaryMessage(): string {
    return `${REFERRAL_NOT_PROSECUTION_MESSAGE}. ${REFERRAL_NOT_GOVERNMENT_DECISION_MESSAGE}`;
  }

  retainedAuthorityMessage(): string {
    return RETAINED_NATIONAL_AUTHORITY_MESSAGE;
  }

  async assertReferralDoesNotImplyEnforcementAction(referralId: string): Promise<void> {
    const referral = await this.prisma.enforcementReferral.findUnique({
      where: { id: referralId },
    });
    if (!referral) {
      throw new NotFoundException('Enforcement referral not found');
    }
    if (referral.status === EnforcementReferralStatus.SENT && this.referralIsProsecution()) {
      throw new BadRequestException(REFERRAL_NOT_PROSECUTION_MESSAGE);
    }
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
