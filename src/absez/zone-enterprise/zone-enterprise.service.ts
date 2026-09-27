import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type AbsezZoneEnterprise,
  ZoneEnterpriseOperatingStatus,
  ZoneEnterpriseZoneStatus,
} from '@prisma/client';

import { CorporateRegistryLifecycleService } from '../../corporate-registry/lifecycle/corporate-registry-lifecycle.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ABSEZ_ZONE_ENTERPRISE_REFERENCE_PREFIX,
} from '../absez.constants';
import { AbsezZoneEnterpriseConfigurationService } from '../configuration/absez-zone-enterprise-configuration.service';

export interface EnsureZoneEnterpriseInput {
  organizationId: string;
  institutionId: string;
  approvedActivityCategoryCodes?: string[];
  developmentProjectId?: string;
  actorIdentityId?: string;
}

@Injectable()
export class ZoneEnterpriseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly corporateLifecycle: CorporateRegistryLifecycleService,
    private readonly configuration: AbsezZoneEnterpriseConfigurationService,
  ) {}

  async ensureZoneEnterprise(input: EnsureZoneEnterpriseInput): Promise<AbsezZoneEnterprise> {
    const profile = await this.corporateLifecycle.ensureProfileForOrganization(input.organizationId);

    const existing = await this.prisma.absezZoneEnterprise.findUnique({
      where: {
        organizationId_institutionId: {
          organizationId: input.organizationId,
          institutionId: input.institutionId,
        },
      },
    });
    if (existing) {
      return existing;
    }

    const activityCodes = input.approvedActivityCategoryCodes ?? [];
    if (activityCodes.length > 0) {
      await this.configuration.assertActivityCategoriesPermitted(activityCodes);
    }

    const reference = `${ABSEZ_ZONE_ENTERPRISE_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const created = await this.prisma.absezZoneEnterprise.create({
      data: {
        organizationId: input.organizationId,
        institutionId: input.institutionId,
        corporateRegistryProfileId: profile.id,
        zoneEnterpriseReference: reference,
        zoneStatus: ZoneEnterpriseZoneStatus.DRAFT,
        operatingStatus: ZoneEnterpriseOperatingStatus.NOT_OPERATING,
        approvedActivityCategoryCodes: activityCodes,
        developmentProjectId: input.developmentProjectId,
      },
    });

    await this.prisma.absezZoneEnterpriseStatusHistory.create({
      data: {
        zoneEnterpriseId: created.id,
        toZoneStatus: ZoneEnterpriseZoneStatus.DRAFT,
        toOperatingStatus: ZoneEnterpriseOperatingStatus.NOT_OPERATING,
        summary: 'Zone enterprise record created for registered organization',
        actorIdentityId: input.actorIdentityId,
      },
    });

    return created;
  }

  async getZoneEnterpriseForOrganization(organizationId: string, institutionId: string) {
    const enterprise = await this.prisma.absezZoneEnterprise.findUnique({
      where: { organizationId_institutionId: { organizationId, institutionId } },
      include: {
        currentSezLicence: true,
        conditions: { where: { supersededAt: null } },
        corporateRegistryProfile: {
          select: {
            id: true,
            registrationReference: true,
            registrationStatus: true,
            registeredName: true,
          },
        },
      },
    });
    if (!enterprise) {
      throw new NotFoundException('Zone enterprise record not found for organization');
    }
    return enterprise;
  }

  async markPendingLicence(zoneEnterpriseId: string, actorIdentityId?: string) {
    const enterprise = await this.prisma.absezZoneEnterprise.findUnique({
      where: { id: zoneEnterpriseId },
    });
    if (!enterprise) {
      throw new NotFoundException('Zone enterprise not found');
    }

    const updated = await this.prisma.absezZoneEnterprise.update({
      where: { id: zoneEnterpriseId },
      data: { zoneStatus: ZoneEnterpriseZoneStatus.PENDING_LICENCE },
    });

    await this.prisma.absezZoneEnterpriseStatusHistory.create({
      data: {
        zoneEnterpriseId,
        fromZoneStatus: enterprise.zoneStatus,
        toZoneStatus: ZoneEnterpriseZoneStatus.PENDING_LICENCE,
        fromOperatingStatus: enterprise.operatingStatus,
        toOperatingStatus: enterprise.operatingStatus,
        summary: 'SEZ licence application recorded; zone status pending licence decision',
        actorIdentityId,
      },
    });

    return updated;
  }

  async activateLicensedEnterprise(input: {
    zoneEnterpriseId: string;
    sezLicenceId: string;
    actorIdentityId?: string;
  }) {
    const enterprise = await this.prisma.absezZoneEnterprise.findUniqueOrThrow({
      where: { id: input.zoneEnterpriseId },
    });

    const updated = await this.prisma.absezZoneEnterprise.update({
      where: { id: input.zoneEnterpriseId },
      data: {
        zoneStatus: ZoneEnterpriseZoneStatus.LICENSED,
        operatingStatus: ZoneEnterpriseOperatingStatus.OPERATING,
        currentSezLicenceId: input.sezLicenceId,
      },
    });

    await this.prisma.absezZoneEnterpriseStatusHistory.create({
      data: {
        zoneEnterpriseId: input.zoneEnterpriseId,
        fromZoneStatus: enterprise.zoneStatus,
        toZoneStatus: ZoneEnterpriseZoneStatus.LICENSED,
        fromOperatingStatus: enterprise.operatingStatus,
        toOperatingStatus: ZoneEnterpriseOperatingStatus.OPERATING,
        summary: 'Zone enterprise licensed following authorized SEZ licence issuance',
        actorIdentityId: input.actorIdentityId,
      },
    });

    return updated;
  }
}
