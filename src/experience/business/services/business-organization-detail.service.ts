import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type BusinessOrganizationDetailDto } from '../dto/business-organization.dto';

@Injectable()
export class BusinessOrganizationDetailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async getOrganizationDetail(
    identityId: string,
    organizationId: string,
  ): Promise<BusinessOrganizationDetailDto> {
    await this.access.assertOrganizationAccess(organizationId, identityId);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const accessible = await this.access.listAccessibleOrganizations(identityId);
    const summary = accessible.find((item) => item.organizationId === organizationId);

    if (!summary) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return {
      organizationId: organization.id,
      organizationCode: organization.code,
      organizationName: organization.name,
      description: organization.description,
      organizationStatus: organization.status,
      accessPaths: summary.accessPaths,
      membershipRoleLabel: summary.membershipRoleLabel,
      representativeScopeDescription: summary.representativeScopeDescription,
      registrationStatusLabel: this.mapRegistrationStatusLabel(organization.status),
      disclaimer: {
        label:
          'Corporate identity and registration status are informational and do not confer government authority.',
        labelKey: 'business.organization.disclaimer',
      },
    };
  }

  private mapRegistrationStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Registered and active';
      case 'PENDING':
        return 'Registration pending';
      case 'SUSPENDED':
        return 'Registration suspended';
      case 'REVOKED':
        return 'Registration revoked';
      default:
        return status;
    }
  }
}
