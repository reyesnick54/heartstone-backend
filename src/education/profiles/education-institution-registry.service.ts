import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EDUCATION_INSTITUTION_REGISTRY_PREFIX } from '../education.constants';

@Injectable()
export class EducationInstitutionRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInstitutionRegistry(input: { organizationId: string; jurisdictionId?: string }) {
    const existing = await this.prisma.educationInstitutionRegistryRecord.findFirst({
      where: { organizationId: input.organizationId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.educationInstitutionRegistryRecord.create({
      data: {
        id: randomUUID(),
        registryNumber: `${EDUCATION_INSTITUTION_REGISTRY_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        doesNotSelfAccredit: true,
      },
    });
  }
}
