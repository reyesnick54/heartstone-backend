import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EMPLOYER_REGISTRY_NUMBER_PREFIX } from '../labour.constants';

export interface RegisterEmployerInput {
  organizationId: string;
  jurisdictionId?: string;
  institutionId?: string;
  masterAdministrativeFileId?: string;
}

@Injectable()
export class EmployerRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async registerEmployer(input: RegisterEmployerInput) {
    const registryNumber = `${EMPLOYER_REGISTRY_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.employerRegistryRecord.create({
      data: {
        id: randomUUID(),
        registryNumber,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        institutionId: input.institutionId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        doesNotSelfAuthorizeWorkers: true,
      },
    });
  }
}
