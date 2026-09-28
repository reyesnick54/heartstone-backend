import { ForbiddenException, Injectable } from '@nestjs/common';
import { CarbonManagementDataClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CARBON_MANAGEMENT_REASON_CODES } from '../carbon-management.constants';

export interface CarbonConfidentialAccessContext {
  accessorIdentityId: string;
  carbonProjectId: string;
  classification: CarbonManagementDataClassification;
  endpoint: string;
  hasProgrammeOfficerScope: boolean;
}

@Injectable()
export class CarbonManagementAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertConfidentialAccess(context: CarbonConfidentialAccessContext): Promise<void> {
    let granted = false;
    let reasonCode: string | undefined;

    if (context.classification === CarbonManagementDataClassification.PUBLIC_SUMMARY) {
      granted = true;
    } else if (context.classification === CarbonManagementDataClassification.REGULATORY_ACCESS) {
      granted = context.hasProgrammeOfficerScope;
      if (!granted) {
        reasonCode = CARBON_MANAGEMENT_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
      }
    } else if (context.classification === CarbonManagementDataClassification.COMMERCIAL_CONFIDENTIAL) {
      granted = context.hasProgrammeOfficerScope;
      if (!granted) {
        reasonCode = CARBON_MANAGEMENT_REASON_CODES.COMMERCIAL_CONFIDENTIAL_ACCESS_DENIED;
      }
    } else {
      granted = context.hasProgrammeOfficerScope;
      if (!granted) {
        reasonCode = CARBON_MANAGEMENT_REASON_CODES.TECHNICAL_EVIDENCE_ACCESS_DENIED;
      }
    }

    await this.prisma.carbonDataAccessAudit.create({
      data: {
        accessorIdentityId: context.accessorIdentityId,
        carbonProjectId: context.carbonProjectId,
        classification: context.classification,
        endpoint: context.endpoint,
        granted,
        reasonCode,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        reasonCode ?? CARBON_MANAGEMENT_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED,
      );
    }
  }
}
