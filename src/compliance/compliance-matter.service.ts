import { Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceMatterStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { COMPLIANCE_MATTER_NUMBER_PREFIX } from './compliance.constants';

export interface OpenComplianceMatterInput {
  subject: string;
  caseId?: string;
  officialInstrumentId?: string;
  masterAdministrativeFileId?: string;
  holderIdentityId?: string;
  holderOrganizationId?: string;
}

@Injectable()
export class ComplianceMatterService {
  constructor(private readonly prisma: PrismaService) {}

  async open(input: OpenComplianceMatterInput) {
    const matterNumber = `${COMPLIANCE_MATTER_NUMBER_PREFIX}-${Date.now()}`;

    return this.prisma.complianceMatter.create({
      data: {
        matterNumber,
        subject: input.subject,
        caseId: input.caseId,
        officialInstrumentId: input.officialInstrumentId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        holderIdentityId: input.holderIdentityId,
        holderOrganizationId: input.holderOrganizationId,
        status: ComplianceMatterStatus.OPEN,
      },
    });
  }

  async getById(id: string) {
    const matter = await this.prisma.complianceMatter.findUnique({
      where: { id },
      include: {
        continuingObligations: true,
        inspectionPlans: true,
        inspectionSessions: true,
      },
    });
    if (!matter) {
      throw new NotFoundException(`Compliance matter "${id}" was not found`);
    }
    return matter;
  }

  async close(id: string) {
    return this.prisma.complianceMatter.update({
      where: { id },
      data: {
        status: ComplianceMatterStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }
}
