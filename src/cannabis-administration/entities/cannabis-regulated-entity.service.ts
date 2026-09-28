import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CannabisOperatingStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CANNABIS_REGULATED_ENTITY_PREFIX } from '../cannabis-administration.constants';
import { CannabisAdministrationConfigurationService } from '../configuration/cannabis-administration-configuration.service';

export interface RegisterCannabisRegulatedEntityInput {
  organizationId: string;
  jurisdictionId?: string;
  licenceCategoryCode: string;
}

@Injectable()
export class CannabisRegulatedEntityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuration: CannabisAdministrationConfigurationService,
  ) {}

  async registerRegulatedEntity(input: RegisterCannabisRegulatedEntityInput) {
    if (input.jurisdictionId) {
      await this.configuration.assertLicenceCategoryConfigured(
        input.jurisdictionId,
        input.licenceCategoryCode,
      );
    }

    const entityReferenceNumber = `${CANNABIS_REGULATED_ENTITY_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const entity = await this.prisma.cannabisRegulatedEntityReference.create({
      data: {
        id: randomUUID(),
        entityReferenceNumber,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        licenceCategoryCode: input.licenceCategoryCode,
        operatingStatus: CannabisOperatingStatus.DRAFT,
        doesNotDuplicateOrganization: true,
      },
      include: { organization: true },
    });

    return { entity, organizationRecordsDuplicated: 0 };
  }

  async linkApplicationReference(input: {
    regulatedEntityId: string;
    applicationId?: string;
    caseId?: string;
    licenceCategoryCode?: string;
    serviceCode?: string;
  }) {
    return this.prisma.cannabisApplicationReference.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        applicationId: input.applicationId,
        caseId: input.caseId,
        licenceCategoryCode: input.licenceCategoryCode,
        serviceCode: input.serviceCode,
      },
    });
  }
}
