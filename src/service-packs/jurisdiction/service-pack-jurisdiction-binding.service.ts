import { Injectable } from '@nestjs/common';
import { Prisma, ServicePackJurisdictionBindingKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface EnsureJurisdictionBindingInput {
  servicePackId: string;
  jurisdictionId: string;
  bindingKind?: ServicePackJurisdictionBindingKind;
  authorityMappingsRevalidationRequired?: boolean;
}

@Injectable()
export class ServicePackJurisdictionBindingService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureOperationalBinding(
    tx: Prisma.TransactionClient,
    input: EnsureJurisdictionBindingInput,
  ) {
    return tx.servicePackJurisdictionBinding.upsert({
      where: {
        servicePackId_jurisdictionId: {
          servicePackId: input.servicePackId,
          jurisdictionId: input.jurisdictionId,
        },
      },
      create: {
        servicePackId: input.servicePackId,
        jurisdictionId: input.jurisdictionId,
        bindingKind: input.bindingKind ?? ServicePackJurisdictionBindingKind.OPERATIONAL,
        authorityMappingsRevalidationRequired: input.authorityMappingsRevalidationRequired ?? true,
        governingSourcesRevalidationRequired: true,
        institutionsRevalidationRequired: true,
        feesRevalidationRequired: true,
        eligibilityRevalidationRequired: true,
        integrationsRevalidationRequired: true,
      },
      update: {
        authorityMappingsRevalidationRequired: input.authorityMappingsRevalidationRequired ?? true,
      },
    });
  }

  async bindTemplateClone(input: EnsureJurisdictionBindingInput) {
    return this.prisma.$transaction(async (tx) => {
      await tx.servicePack.update({
        where: { id: input.servicePackId },
        data: { jurisdictionId: input.jurisdictionId },
      });

      return this.ensureOperationalBinding(tx, {
        ...input,
        bindingKind: ServicePackJurisdictionBindingKind.TEMPLATE,
        authorityMappingsRevalidationRequired: true,
      });
    });
  }

  async getBindingsForPack(servicePackId: string) {
    return this.prisma.servicePackJurisdictionBinding.findMany({
      where: { servicePackId },
      include: { jurisdiction: true },
    });
  }
}
