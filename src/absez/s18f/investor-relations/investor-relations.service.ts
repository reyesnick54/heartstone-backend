import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InvestorInquiryStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { INVESTOR_INQUIRY_REFERENCE_PREFIX } from '../absez-s18f.constants';

@Injectable()
export class InvestorRelationsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInvestorProfile(institutionId: string, organizationId: string) {
    const profileReference = `IR-${organizationId.slice(0, 8).toUpperCase()}`;
    return this.prisma.investorRelationsProfile.upsert({
      where: {
        institutionId_organizationId: { institutionId, organizationId },
      },
      create: {
        id: randomUUID(),
        institutionId,
        organizationId,
        profileReference,
      },
      update: {},
      include: { organization: true },
    });
  }

  async createInquiry(input: {
    institutionId: string;
    organizationId: string;
    subjectSummary: string;
    strategicProjectProfileId?: string;
    caseId?: string;
    managerIdentityId?: string;
  }) {
    const profile = await this.ensureInvestorProfile(input.institutionId, input.organizationId);
    const inquiryReference = `${INVESTOR_INQUIRY_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const inquiry = await this.prisma.investorInquiryRecord.create({
      data: {
        id: randomUUID(),
        investorRelationsProfileId: profile.id,
        inquiryReference,
        subjectSummary: input.subjectSummary,
        strategicProjectProfileId: input.strategicProjectProfileId,
        status: InvestorInquiryStatus.OPEN,
        statusHistory: {
          create: {
            id: randomUUID(),
            toStatus: InvestorInquiryStatus.OPEN,
          },
        },
      },
    });

    if (input.caseId) {
      await this.prisma.investorInquiryCaseLink.create({
        data: {
          id: randomUUID(),
          investorInquiryRecordId: inquiry.id,
          caseId: input.caseId,
        },
      });
    }

    if (input.managerIdentityId) {
      await this.prisma.investorCaseManagerAssignment.create({
        data: {
          id: randomUUID(),
          investorInquiryRecordId: inquiry.id,
          managerIdentityId: input.managerIdentityId,
        },
      });
      await this.prisma.investorInquiryRecord.update({
        where: { id: inquiry.id },
        data: { status: InvestorInquiryStatus.ASSIGNED },
      });
    }

    return this.prisma.investorInquiryRecord.findUniqueOrThrow({
      where: { id: inquiry.id },
      include: {
        investorRelationsProfile: { include: { organization: true } },
        caseLinks: true,
        caseManagerAssignments: true,
      },
    });
  }
}
