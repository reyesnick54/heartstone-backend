import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialServicesActorPersona, RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FINANCIAL_SERVICES_REASON_CODES } from '../financial-services.constants';
import { FinancialServicesBoundaryService } from './financial-services-boundary.service';

export interface FinancialRegulatoryAccessContext {
  accessorIdentityId: string;
  regulatedEntityProfileId: string;
  actorPersona: FinancialServicesActorPersona;
  endpoint: string;
  organizationId?: string;
  representativeAuthorityId?: string;
  financialOfficerAuthorized?: boolean;
}

@Injectable()
export class FinancialServicesAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialServicesBoundaryService,
  ) {}

  async assertRegulatedEntityAccess(context: FinancialRegulatoryAccessContext): Promise<void> {
    const profile = await this.prisma.financialRegulatedEntityProfile.findUnique({
      where: { id: context.regulatedEntityProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Financial regulated entity profile not found');
    }

    let granted = false;
    let reasonCode: string | undefined;

    if (
      context.actorPersona === FinancialServicesActorPersona.FINANCIAL_SERVICES_OFFICER &&
      context.financialOfficerAuthorized
    ) {
      granted = true;
    } else if (
      context.actorPersona === FinancialServicesActorPersona.SENIOR_DECISION_OFFICER &&
      context.financialOfficerAuthorized
    ) {
      granted = true;
    } else if (
      context.actorPersona === FinancialServicesActorPersona.COMPLIANCE_OFFICER &&
      context.financialOfficerAuthorized
    ) {
      granted = true;
    } else if (
      context.actorPersona === FinancialServicesActorPersona.REGULATED_ENTITY_REPRESENTATIVE
    ) {
      if (!context.representativeAuthorityId) {
        throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED);
      }
      const authority = await this.prisma.representativeAuthority.findUnique({
        where: { id: context.representativeAuthorityId },
      });
      const now = new Date();
      granted =
        authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
        authority.identityId === context.accessorIdentityId &&
        authority.organizationId === profile.organizationId &&
        authority.effectiveFrom <= now &&
        (authority.effectiveUntil == null || authority.effectiveUntil > now);
      if (!granted) {
        reasonCode = FINANCIAL_SERVICES_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED;
      }
    } else if (context.actorPersona === FinancialServicesActorPersona.APPLICANT) {
      this.boundary.assertRegulatoryFileAccessDenied(context.actorPersona);
    } else {
      reasonCode = FINANCIAL_SERVICES_REASON_CODES.CROSS_ENTITY_ACCESS_DENIED;
    }

    await this.prisma.financialRegulatoryAccessAudit.create({
      data: {
        accessorIdentityId: context.accessorIdentityId,
        regulatedEntityProfileId: context.regulatedEntityProfileId,
        actorPersona: context.actorPersona,
        endpoint: context.endpoint,
        granted,
        reasonCode,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        reasonCode ?? FINANCIAL_SERVICES_REASON_CODES.REGULATORY_FILE_ACCESS_DENIED,
      );
    }
  }
}
