import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MaritimeDataClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MARITIME_REASON_CODES } from '../maritime.constants';

export interface MaritimeConfidentialAccessContext {
  accessorIdentityId: string;
  vesselRecordId: string;
  accessorInstitutionId?: string;
  classification: MaritimeDataClassification;
  endpoint: string;
  hasMaritimeOfficerScope: boolean;
  hasSecuritySensitiveScope: boolean;
}

@Injectable()
export class MaritimeAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertConfidentialAccess(context: MaritimeConfidentialAccessContext): Promise<void> {
    const vessel = await this.prisma.vesselRecord.findUnique({
      where: { id: context.vesselRecordId },
    });
    if (!vessel) {
      throw new NotFoundException('Vessel record not found');
    }

    let granted = false;
    let reasonCode: string | undefined;

    if (
      vessel.institutionId &&
      context.accessorInstitutionId &&
      vessel.institutionId !== context.accessorInstitutionId
    ) {
      reasonCode = MARITIME_REASON_CODES.CROSS_INSTITUTION_ACCESS_DENIED;
    } else if (context.classification === MaritimeDataClassification.PUBLIC_SUMMARY) {
      granted = true;
    } else if (context.classification === MaritimeDataClassification.REGULATORY_ACCESS) {
      granted = context.hasMaritimeOfficerScope;
      if (!granted) {
        reasonCode = MARITIME_REASON_CODES.CONFIDENTIAL_VESSEL_ACCESS_DENIED;
      }
    } else if (context.classification === MaritimeDataClassification.CONFIDENTIAL_COMMERCIAL) {
      granted = context.hasMaritimeOfficerScope;
      if (!granted) {
        reasonCode = MARITIME_REASON_CODES.CONFIDENTIAL_VESSEL_ACCESS_DENIED;
      }
    } else {
      granted = context.hasSecuritySensitiveScope;
      if (!granted) {
        reasonCode = MARITIME_REASON_CODES.SECURITY_SENSITIVE_ACCESS_DENIED;
      }
    }

    await this.prisma.maritimeDataAccessAudit.create({
      data: {
        accessorIdentityId: context.accessorIdentityId,
        vesselRecordId: context.vesselRecordId,
        institutionId: context.accessorInstitutionId,
        classification: context.classification,
        endpoint: context.endpoint,
        granted,
        reasonCode,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        reasonCode ?? MARITIME_REASON_CODES.CROSS_INSTITUTION_ACCESS_DENIED,
      );
    }
  }
}
