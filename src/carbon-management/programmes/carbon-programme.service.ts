import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CarbonProgrammeStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CARBON_PROGRAMME_PREFIX } from '../carbon-management.constants';

export interface RegisterCarbonProgrammeInput {
  jurisdictionId: string;
  programmeCode: string;
  programmeName: string;
  configuredProgrammeTypeCode?: string;
}

@Injectable()
export class CarbonProgrammeService {
  constructor(private readonly prisma: PrismaService) {}

  async registerProgramme(input: RegisterCarbonProgrammeInput) {
    const programmeReferenceNumber = `${CARBON_PROGRAMME_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.carbonProgrammeReference.create({
      data: {
        id: randomUUID(),
        programmeReferenceNumber,
        jurisdictionId: input.jurisdictionId,
        programmeCode: input.programmeCode,
        programmeName: input.programmeName,
        configuredProgrammeTypeCode: input.configuredProgrammeTypeCode,
        status: CarbonProgrammeStatus.DRAFT,
      },
    });
  }
}
