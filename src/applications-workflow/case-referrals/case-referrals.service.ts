import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CaseReferral,
  CaseReferralStatus,
  CaseReferralType,
  CaseSlaClockStatus,
  CaseSlaClockType,
  CaseSlaPauseReason,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CASE_COORDINATION_EXPLANATION_CODES } from '../applications-workflow.constants';

export interface CreateCaseReferralInput {
  caseId: string;
  referralReference: string;
  referralType: CaseReferralType;
  referringInstitutionId: string;
  referringDepartmentId?: string;
  receivingInstitutionId?: string;
  receivingExternalAuthorityId?: string;
  workflowStepId?: string;
  authorityDependencyId?: string;
  purpose: string;
  questionsRequestedResponse?: string;
  dueAt?: Date;
  securityHandlingClassification?: string;
  outgoingPackageReferences?: string[];
  createdByIdentityId: string;
}

@Injectable()
export class CaseReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReferral(input: CreateCaseReferralInput): Promise<CaseReferral> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    return this.prisma.caseReferral.create({
      data: {
        caseId: input.caseId,
        referralReference: input.referralReference,
        referralType: input.referralType,
        referringInstitutionId: input.referringInstitutionId,
        referringDepartmentId: input.referringDepartmentId,
        receivingInstitutionId: input.receivingInstitutionId,
        receivingExternalAuthorityId: input.receivingExternalAuthorityId,
        workflowStepId: input.workflowStepId,
        authorityDependencyId: input.authorityDependencyId,
        purpose: input.purpose,
        questionsRequestedResponse: input.questionsRequestedResponse,
        dueAt: input.dueAt,
        securityHandlingClassification: input.securityHandlingClassification,
        outgoingPackageReferences: input.outgoingPackageReferences ?? [],
        createdByIdentityId: input.createdByIdentityId,
        status: CaseReferralStatus.DRAFT,
      },
    });
  }

  async sendReferral(referralId: string): Promise<CaseReferral> {
    const referral = await this.requireReferral(referralId);
    return this.prisma.caseReferral.update({
      where: { id: referral.id },
      data: {
        status: CaseReferralStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async getReferralHistory(caseId: string): Promise<CaseReferral[]> {
    return this.prisma.caseReferral.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
      include: { responses: true },
    });
  }

  async pauseConfiguredSlaForReferral(
    referralId: string,
    slaClockId: string,
    authorizedByIdentityId?: string,
  ): Promise<{ paused: boolean; explanationCode: string }> {
    const referral = await this.requireReferral(referralId);
    const clock = await this.prisma.caseSlaClock.findUnique({ where: { id: slaClockId } });
    if (clock?.caseId !== referral.caseId) {
      throw new NotFoundException(`SLA clock "${slaClockId}" was not found for this case`);
    }

    if (clock.clockType !== CaseSlaClockType.ABSEZ_PROCESSING_TIME) {
      return { paused: false, explanationCode: 'SLA_NOT_PAUSABLE_FOR_REFERRAL' };
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.caseSlaPause.create({
        data: {
          slaClockId: clock.id,
          referralId: referral.id,
          pauseReason: CaseSlaPauseReason.REFERRAL_PENDING,
          pausedAt: now,
          authorizedByIdentityId,
        },
      }),
      this.prisma.caseSlaClock.update({
        where: { id: clock.id },
        data: { status: CaseSlaClockStatus.PAUSED },
      }),
    ]);

    return {
      paused: true,
      explanationCode: CASE_COORDINATION_EXPLANATION_CODES.REFERRAL_PRESERVES_INSTITUTION,
    };
  }

  private async requireReferral(referralId: string): Promise<CaseReferral> {
    const referral = await this.prisma.caseReferral.findUnique({ where: { id: referralId } });
    if (!referral) {
      throw new NotFoundException(`Case referral "${referralId}" was not found`);
    }
    return referral;
  }
}
