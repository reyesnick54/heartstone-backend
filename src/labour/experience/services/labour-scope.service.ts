import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LabourScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async requireWorkerProfileReference(identityId: string) {
    const profile = await this.prisma.workerProfileReference.findFirst({
      where: { workerIdentityId: identityId },
      orderBy: { createdAt: 'desc' },
    });
    if (!profile) {
      throw new NotFoundException('No worker profile reference is linked to this identity');
    }
    return profile;
  }

  async findEmployerRegistryRecord(organizationId: string) {
    return this.prisma.employerRegistryRecord.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  buildOfficialJurisdictionFilter(jurisdictionIds: string[]) {
    return jurisdictionIds.length ? { jurisdictionId: { in: jurisdictionIds } } : {};
  }

  buildWorkerJurisdictionFilter(jurisdictionIds: string[]) {
    const base = this.buildOfficialJurisdictionFilter(jurisdictionIds);
    return Object.keys(base).length ? { workerProfileReference: base } : {};
  }

  buildEmployerJurisdictionFilter(jurisdictionIds: string[]) {
    const base = this.buildOfficialJurisdictionFilter(jurisdictionIds);
    return Object.keys(base).length ? { employerRegistryRecord: base } : {};
  }
}
