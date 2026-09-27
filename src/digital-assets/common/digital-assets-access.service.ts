import { ForbiddenException, Injectable } from '@nestjs/common';
import { DigitalAssetsDataClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DIGITAL_ASSETS_REASON_CODES } from '../digital-assets.constants';

export interface DigitalAssetsConfidentialAccessContext {
  accessorIdentityId: string;
  regulatedEntityId: string;
  classification: DigitalAssetsDataClassification;
  endpoint: string;
  hasRegulatoryOfficerScope: boolean;
  hasBeneficialOwnershipScope: boolean;
}

@Injectable()
export class DigitalAssetsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertConfidentialAccess(context: DigitalAssetsConfidentialAccessContext): Promise<void> {
    let granted = false;
    let reasonCode: string | undefined;

    if (context.classification === DigitalAssetsDataClassification.PUBLIC_SUMMARY) {
      granted = true;
    } else if (context.classification === DigitalAssetsDataClassification.REGULATORY_ACCESS) {
      granted = context.hasRegulatoryOfficerScope;
      if (!granted) {
        reasonCode = DIGITAL_ASSETS_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
      }
    } else if (
      context.classification === DigitalAssetsDataClassification.CONFIDENTIAL_TECHNICAL
    ) {
      granted = context.hasRegulatoryOfficerScope;
      if (!granted) {
        reasonCode = DIGITAL_ASSETS_REASON_CODES.CONFIDENTIAL_TECHNICAL_ACCESS_DENIED;
      }
    } else {
      granted = context.hasBeneficialOwnershipScope;
      if (!granted) {
        reasonCode = DIGITAL_ASSETS_REASON_CODES.BENEFICIAL_OWNERSHIP_ACCESS_DENIED;
      }
    }

    await this.prisma.digitalAssetsDataAccessAudit.create({
      data: {
        accessorIdentityId: context.accessorIdentityId,
        regulatedEntityId: context.regulatedEntityId,
        classification: context.classification,
        endpoint: context.endpoint,
        granted,
        reasonCode,
      },
    });

    if (!granted) {
      throw new ForbiddenException(reasonCode ?? DIGITAL_ASSETS_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED);
    }
  }
}
