import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export interface CreateExternalRecordsRepositoryInput {
  code: string;
  provider: string;
  institutionalOwnership: string;
  systemOfRecord?: boolean;
  location: string;
  exportCapability: string;
  retentionCompatibility: string;
  legalHoldCapability: string;
  backupTreatment: string;
  terminationExitRequirement: string;
  vendorDefaultDeletionPolicy?: string;
  institutionalScheduleOverridesVendor?: boolean;
}

@Injectable()
export class ExternalRecordsRepositoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateExternalRecordsRepositoryInput) {
    return this.prisma.externalRecordsRepository.create({
      data: {
        code: input.code,
        provider: input.provider,
        institutionalOwnership: input.institutionalOwnership,
        systemOfRecord: input.systemOfRecord ?? false,
        location: input.location,
        exportCapability: input.exportCapability,
        retentionCompatibility: input.retentionCompatibility,
        legalHoldCapability: input.legalHoldCapability,
        backupTreatment: input.backupTreatment,
        terminationExitRequirement: input.terminationExitRequirement,
        vendorDefaultDeletionPolicy: input.vendorDefaultDeletionPolicy,
        institutionalScheduleOverridesVendor:
          input.institutionalScheduleOverridesVendor ?? true,
      },
    });
  }

  async assertInstitutionalRetentionControls(code: string): Promise<boolean> {
    const repository = await this.prisma.externalRecordsRepository.findUnique({ where: { code } });
    if (!repository) {
      throw new NotFoundException(`ExternalRecordsRepository "${code}" was not found`);
    }
    return repository.institutionalScheduleOverridesVendor;
  }
}
