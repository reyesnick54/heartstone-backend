import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { DigitalAssetsOperatingStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DIGITAL_ASSETS_REGULATED_ENTITY_PREFIX } from '../digital-assets.constants';

export interface RegisterDigitalAssetsRegulatedEntityInput {
  organizationId: string;
  jurisdictionId?: string;
  activityCategoryCode: string;
  masterAdministrativeFileId?: string;
}

@Injectable()
export class DigitalAssetsRegulatedEntityService {
  constructor(private readonly prisma: PrismaService) {}

  async registerRegulatedEntity(input: RegisterDigitalAssetsRegulatedEntityInput) {
    const entityReferenceNumber = `${DIGITAL_ASSETS_REGULATED_ENTITY_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const entity = await this.prisma.digitalAssetsRegulatedEntityReference.create({
      data: {
        id: randomUUID(),
        entityReferenceNumber,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        activityCategoryCode: input.activityCategoryCode,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        operatingStatus: DigitalAssetsOperatingStatus.DRAFT,
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
    licenceTypeCode?: string;
    serviceCode?: string;
  }) {
    return this.prisma.digitalAssetsApplicationReference.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        applicationId: input.applicationId,
        caseId: input.caseId,
        licenceTypeCode: input.licenceTypeCode,
        serviceCode: input.serviceCode,
      },
    });
  }
}
