import { Injectable } from '@nestjs/common';
import { ConfigurationChangeStatus, ConfigurationItemStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { ReleaseRevalidationService } from '../releases/release-revalidation.service';

@Injectable()
export class ConfigurationGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly revalidation: ReleaseRevalidationService,
  ) {}

  async registerConfigurationItem(input: {
    key: string;
    name: string;
    description?: string;
    currentVersion: string;
    environmentScope?: string;
    isMaterial?: boolean;
  }) {
    return this.prisma.configurationItem.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        currentVersion: input.currentVersion,
        environmentScope: input.environmentScope,
        isMaterial: input.isMaterial ?? false,
        status: ConfigurationItemStatus.ACTIVE,
      },
    });
  }

  async submitConfigurationChange(input: {
    configurationItemId: string;
    fromVersion: string;
    toVersion: string;
    changeDigest: string;
    requesterIdentityId: string;
  }) {
    const item = await this.prisma.configurationItem.findUniqueOrThrow({
      where: { id: input.configurationItemId },
    });

    return this.prisma.configurationChange.create({
      data: {
        configurationItemId: input.configurationItemId,
        fromVersion: input.fromVersion,
        toVersion: input.toVersion,
        changeDigest: input.changeDigest,
        requesterIdentityId: input.requesterIdentityId,
        triggersRevalidation: item.isMaterial,
        status: ConfigurationChangeStatus.SUBMITTED,
      },
    });
  }

  async applyConfigurationChange(configurationChangeId: string) {
    const change = await this.prisma.configurationChange.findUniqueOrThrow({
      where: { id: configurationChangeId },
      include: { configurationItem: true },
    });

    if (change.configurationItem.isMaterial) {
      await this.revalidation.recordTrigger({
        triggerType: 'MATERIAL_CONFIGURATION_CHANGE',
        sourceRecordType: 'ConfigurationChange',
        sourceRecordId: change.id,
        reason: `Material configuration change for ${change.configurationItem.key}`,
      });
      this.boundary.assertMaterialChangeTriggersRevalidation(true, true);
    }

    await this.prisma.configurationItem.update({
      where: { id: change.configurationItemId },
      data: { currentVersion: change.toVersion },
    });

    return this.prisma.configurationChange.update({
      where: { id: configurationChangeId },
      data: {
        status: ConfigurationChangeStatus.APPLIED,
        appliedAt: new Date(),
      },
    });
  }
}
