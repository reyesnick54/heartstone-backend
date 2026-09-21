import { Injectable } from '@nestjs/common';

import { BusinessAccessService } from '../../common/business-access.service';
import { type BusinessOrganizationsResponseDto } from '../dto/business-organization.dto';

@Injectable()
export class BusinessOrganizationsService {
  constructor(private readonly access: BusinessAccessService) {}

  async listOrganizations(identityId: string): Promise<BusinessOrganizationsResponseDto> {
    const items = await this.access.listAccessibleOrganizations(identityId);

    return {
      items: items.map((organization) => ({
        organizationId: organization.organizationId,
        organizationCode: organization.organizationCode,
        organizationName: organization.organizationName,
        organizationStatus: organization.organizationStatus,
        accessPaths: organization.accessPaths,
        membershipRoleLabel: organization.membershipRoleLabel,
        representativeScopeDescription: organization.representativeScopeDescription,
      })),
      disclaimer: {
        label:
          'Organization listings are derived from active membership and representative authority records only.',
        labelKey: 'business.organizations.disclaimer',
      },
    };
  }
}
