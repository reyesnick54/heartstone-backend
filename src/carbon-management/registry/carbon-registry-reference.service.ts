import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CarbonRegistryReferenceStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CARBON_REGISTRY_PREFIX } from '../carbon-management.constants';

@Injectable()
export class CarbonRegistryReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async recordRegistryReference(input: {
    carbonProjectId: string;
    registrySystemCode: string;
    externalRegistryReference: string;
    provenanceSummary?: string;
    evidenceRecordId?: string;
  }) {
    const provenanceSummary =
      input.provenanceSummary ??
      `Registry reference recorded (${CARBON_REGISTRY_PREFIX}); does not imply government approval`;

    return this.prisma.carbonRegistryReference.create({
      data: {
        id: randomUUID(),
        carbonProjectId: input.carbonProjectId,
        registrySystemCode: input.registrySystemCode,
        externalRegistryReference: input.externalRegistryReference,
        status: CarbonRegistryReferenceStatus.CONFIGURED,
        provenanceSummary,
        evidenceRecordId: input.evidenceRecordId,
        doesNotImplyGovernmentApproval: true,
      },
    });
  }
}
