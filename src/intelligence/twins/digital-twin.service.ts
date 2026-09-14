import { Injectable, NotFoundException } from '@nestjs/common';
import { DigitalTwinStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from '../common/intelligence-safe-halt.service';

export interface CreateDigitalTwinInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateDigitalTwinVersionInput {
  digitalTwinDefinitionId: string;
  twinConfig?: Record<string, unknown>;
  limitations?: string;
}

@Injectable()
export class DigitalTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly safeHalt: IntelligenceSafeHaltService,
  ) {}

  async findById(id: string) {
    const twin = await this.prisma.digitalTwinDefinition.findUnique({
      where: { id },
      include: { versions: { include: { snapshots: true } } },
    });
    if (!twin) {
      throw new NotFoundException(`Digital twin ${id} not found`);
    }
    return twin;
  }

  async createDefinition(input: CreateDigitalTwinInput) {
    this.boundary.assertTwinNotRealObject();
    return this.prisma.digitalTwinDefinition.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
  }

  async createVersion(input: CreateDigitalTwinVersionInput) {
    const twin = await this.findById(input.digitalTwinDefinitionId);
    const nextVersion =
      (twin.versions.length > 0 ? Math.max(...twin.versions.map((v) => v.versionNumber)) : 0) + 1;
    return this.prisma.digitalTwinVersion.create({
      data: {
        digitalTwinDefinitionId: input.digitalTwinDefinitionId,
        versionNumber: nextVersion,
        twinConfig: (input.twinConfig ?? {}) as Prisma.InputJsonValue,
        limitations: input.limitations,
        status: DigitalTwinStatus.ACTIVE,
      },
    });
  }

  async markStale(versionId: string) {
    return this.prisma.digitalTwinVersion.update({
      where: { id: versionId },
      data: {
        isStale: true,
        staleAt: new Date(),
        status: DigitalTwinStatus.STALE,
      },
    });
  }

  async assertConsequentialUseAllowed(versionId: string, consequential: boolean) {
    const version = await this.prisma.digitalTwinVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException(`Digital twin version ${versionId} not found`);
    }
    this.boundary.assertStaleTwinSafeHalt(version.isStale, consequential);
    this.safeHalt.assertConsequentialPathAllowed({
      twinStale: version.isStale,
      twinStaleAt: version.staleAt,
      digitalTwinStatus: version.status,
      consequential,
    });
    this.boundary.assertConsequentialTwinUseRequiresReview(
      consequential,
      !version.consequentialUseHalted,
    );
  }
}
