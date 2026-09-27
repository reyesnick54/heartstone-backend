import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialDelegatedFunctionActivation } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FINANCIAL_REGULATED_ENTITY_REFERENCE_PREFIX } from '../financial-services.constants';

@Injectable()
export class FinancialRegulatedEntityProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async registerRegulatedEntity(input: {
    organizationId: string;
    activityCategoryCode: string;
    jurisdictionId?: string;
    externalRegulatorReference?: string;
    governingDelegationReference?: string;
    delegatedLicenceFunctionActivation?: FinancialDelegatedFunctionActivation;
  }) {
    const entityReference = `${FINANCIAL_REGULATED_ENTITY_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.financialRegulatedEntityProfile.create({
      data: {
        id: randomUUID(),
        entityReference,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        activityCategoryCode: input.activityCategoryCode,
        externalRegulatorReference: input.externalRegulatorReference,
        governingDelegationReference: input.governingDelegationReference,
        delegatedLicenceFunctionActivation:
          input.delegatedLicenceFunctionActivation ??
          FinancialDelegatedFunctionActivation.INACTIVE,
      },
    });
  }

  async linkBeneficialOwnershipReference(input: {
    regulatedEntityProfileId: string;
    corporateBeneficialOwnershipDeclarationId: string;
    linkageRole?: string;
  }) {
    const profile = await this.prisma.financialRegulatedEntityProfile.findUnique({
      where: { id: input.regulatedEntityProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Financial regulated entity profile not found');
    }

    return this.prisma.financialBeneficialOwnershipLinkage.create({
      data: {
        id: randomUUID(),
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        corporateBeneficialOwnershipDeclarationId: input.corporateBeneficialOwnershipDeclarationId,
        linkageRole: input.linkageRole ?? 'REGULATORY_REFERENCE',
      },
    });
  }

  async getProfileForOrganization(organizationId: string) {
    const profile = await this.prisma.financialRegulatedEntityProfile.findFirst({
      where: { organizationId },
      include: {
        beneficialOwnershipLinkages: true,
        responsiblePersons: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Financial regulated entity profile not found for organization');
    }
    return profile;
  }
}
