import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogLifecycleStatus, OfficialInstrumentKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { assertSafeTemplateContent } from '../common/template-sanitizer.util';

@Injectable()
export class InstrumentCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async activateInstrumentTypeVersion(id: string) {
    const version = await this.prisma.instrumentTypeVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`InstrumentTypeVersion "${id}" was not found`);
    }
    if (version.lifecycleStatus === CatalogLifecycleStatus.ACTIVE) {
      return version;
    }

    return this.prisma.instrumentTypeVersion.update({
      where: { id },
      data: { lifecycleStatus: CatalogLifecycleStatus.ACTIVE },
    });
  }

  async activateTemplateVersion(id: string, approvedByIdentityId: string) {
    const version = await this.prisma.instrumentTemplateVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundException(`InstrumentTemplateVersion "${id}" was not found`);
    }
    if (version.lifecycleStatus === CatalogLifecycleStatus.ACTIVE) {
      return version;
    }

    assertSafeTemplateContent('contentTemplate', version.contentTemplate);

    return this.prisma.instrumentTemplateVersion.update({
      where: { id },
      data: {
        lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
        approvedAt: new Date(),
        approvedByIdentityId,
      },
    });
  }

  async activateNumberingRule(id: string) {
    const rule = await this.prisma.instrumentNumberingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`InstrumentNumberingRule "${id}" was not found`);
    }

    return this.prisma.instrumentNumberingRule.update({
      where: { id },
      data: { lifecycleStatus: CatalogLifecycleStatus.ACTIVE },
    });
  }

  async getInstrumentTypeVersion(id: string) {
    const version = await this.prisma.instrumentTypeVersion.findUnique({
      where: { id },
      include: {
        instrumentTypeDefinition: true,
        requiredTemplateVersion: true,
        numberingRule: true,
        eligibleDecisionTypes: true,
      },
    });

    if (!version) {
      throw new NotFoundException(`InstrumentTypeVersion "${id}" was not found`);
    }

    return version;
  }

  assertTemplateVersionImmutable(version: { lifecycleStatus: CatalogLifecycleStatus }) {
    if (version.lifecycleStatus === CatalogLifecycleStatus.ACTIVE) {
      throw new BadRequestException('Active template versions are immutable');
    }
  }

  async createInstrumentTypeDefinition(data: {
    code: string;
    name: string;
    kind: OfficialInstrumentKind;
    description?: string;
  }) {
    return this.prisma.instrumentTypeDefinition.create({ data });
  }
}
