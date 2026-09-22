import { Injectable } from '@nestjs/common';

import { CorporateRegistryProfileQueryService } from '../../../corporate-registry/profile/corporate-registry-profile-query.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  type BusinessCorporateActionsResponseDto,
  type BusinessCorporateCertificatesResponseDto,
  type BusinessCorporateFilingsResponseDto,
  type BusinessCorporateOfficersResponseDto,
  type BusinessCorporateProfileResponseDto,
} from '../dto/business-corporate-registry.dto';

@Injectable()
export class BusinessCorporateRegistryService {
  constructor(
    private readonly access: BusinessAccessService,
    private readonly profileQuery: CorporateRegistryProfileQueryService,
  ) {}

  async getCorporateProfile(
    identityId: string,
    organizationId: string,
  ): Promise<BusinessCorporateProfileResponseDto> {
    const organizationAccess = await this.access.assertOrganizationAccess(
      organizationId,
      identityId,
    );
    return this.profileQuery.getCorporateProfile(organizationId, organizationAccess);
  }

  async listFilings(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessCorporateFilingsResponseDto> {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, totalItems } = await this.profileQuery.listFilings(organizationId, {
      page,
      pageSize,
    });

    return {
      items: items.map((item) => ({
        filingId: item.id,
        filingType: item.filingType,
        status: item.status,
        label: item.label,
        dueDate: item.dueDate?.toISOString() ?? null,
        submittedAt: item.submittedAt?.toISOString() ?? null,
      })),
      page,
      pageSize,
      totalItems,
    };
  }

  async listOfficers(
    identityId: string,
    organizationId: string,
  ): Promise<BusinessCorporateOfficersResponseDto> {
    const organizationAccess = await this.access.assertOrganizationAccess(
      organizationId,
      identityId,
    );
    const items = await this.profileQuery.listOfficers(organizationId, organizationAccess);
    return { items };
  }

  async listCertificates(
    identityId: string,
    organizationId: string,
  ): Promise<BusinessCorporateCertificatesResponseDto> {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const certificates = await this.profileQuery.listCertificates(organizationId);
    return {
      items: certificates.map((certificate) => ({
        certificateId: certificate.id,
        certificateReference: certificate.certificateReference,
        label: certificate.label,
        status: certificate.status,
        issuedAt: certificate.issuedAt?.toISOString() ?? null,
      })),
    };
  }

  async listCorporateActions(
    identityId: string,
    organizationId: string,
  ): Promise<BusinessCorporateActionsResponseDto> {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const actions = await this.profileQuery.listCorporateActions(organizationId);
    return {
      items: actions.map((action) => ({
        actionId: action.id,
        actionType: action.actionType,
        label: action.label,
        status: action.status,
        dueDate: action.dueDate?.toISOString() ?? null,
      })),
    };
  }
}
