import { Injectable } from '@nestjs/common';
import {
  CorporateFilingStatus,
  CorporateRegistryActionStatus,
  CorporateRegistryRecordStatus,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type BusinessOrganizationAccess } from '../../experience/common/business-access.service';
import { CorporateRegistryProfileNotFoundException } from '../common/corporate-registry.exceptions';
import { CorporateRegistryLifecycleService } from '../lifecycle/corporate-registry-lifecycle.service';

@Injectable()
export class CorporateRegistryProfileQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycleService: CorporateRegistryLifecycleService,
  ) {}

  private async loadProfile(organizationId: string) {
    const profile = await this.prisma.corporateRegistryProfile.findUnique({
      where: { organizationId },
      include: {
        registeredOffices: { where: { isCurrent: true }, take: 1 },
        officers: {
          where: {
            recordStatus: {
              in: [
                CorporateRegistryRecordStatus.APPROVED,
                CorporateRegistryRecordStatus.PENDING_REVIEW,
              ],
            },
            supersededAt: null,
          },
        },
        filings: { orderBy: { dueDate: 'asc' } },
        certificates: true,
        actions: {
          where: {
            status: {
              in: [CorporateRegistryActionStatus.OPEN, CorporateRegistryActionStatus.IN_PROGRESS],
            },
          },
        },
        beneficialOwnershipDeclarations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!profile) {
      throw new CorporateRegistryProfileNotFoundException(organizationId);
    }

    return profile;
  }

  async getCorporateProfile(organizationId: string, access: BusinessOrganizationAccess) {
    await this.lifecycleService.ensureProfileForOrganization(organizationId);
    const profile = await this.loadProfile(organizationId);

    const includeBeneficialOwnership = access.hasFullOrganizationVisibility;
    const officers = profile.officers.filter(
      (officer) => access.hasFullOrganizationVisibility || officer.permitsPublicDisclosure,
    );

    const upcomingFilings = profile.filings.filter(
      (filing) =>
        filing.status === CorporateFilingStatus.DRAFT ||
        filing.status === CorporateFilingStatus.OVERDUE ||
        filing.status === CorporateFilingStatus.SUBMITTED,
    );

    return {
      organizationId,
      profileId: profile.id,
      registeredName: profile.registeredName,
      registrationReference: profile.registrationReference,
      registrationStatus: profile.registrationStatus,
      entityType: profile.entityType,
      registrationDate: profile.registrationDate?.toISOString() ?? null,
      registeredOffice: profile.registeredOffices[0] ?? null,
      officers: officers.map((officer) => ({
        officerId: officer.id,
        displayName: officer.displayName,
        role: officer.role,
        permitsPublicDisclosure: officer.permitsPublicDisclosure,
      })),
      filingStatus: profile.filingStatusSummary,
      upcomingFilingRequirements: upcomingFilings.map((filing) => ({
        filingId: filing.id,
        filingType: filing.filingType,
        status: filing.status,
        label: filing.label,
        dueDate: filing.dueDate?.toISOString() ?? null,
      })),
      governmentCertificates: profile.certificates.map((certificate) => ({
        certificateId: certificate.id,
        certificateReference: certificate.certificateReference,
        label: certificate.label,
        status: certificate.status,
        issuedAt: certificate.issuedAt?.toISOString() ?? null,
      })),
      businessLicenses: [],
      complianceObligations: profile.actions
        .filter((action) => action.actionType === 'COMPLIANCE')
        .map((action) => ({
          actionId: action.id,
          label: action.label,
          status: action.status,
          dueDate: action.dueDate?.toISOString() ?? null,
        })),
      outstandingCorporateActions: profile.actions.map((action) => ({
        actionId: action.id,
        actionType: action.actionType,
        label: action.label,
        status: action.status,
        dueDate: action.dueDate?.toISOString() ?? null,
      })),
      beneficialOwnershipSummary: includeBeneficialOwnership
        ? profile.beneficialOwnershipDeclarations[0]
          ? {
              declarationReference: profile.beneficialOwnershipDeclarations[0].declarationReference,
              status: profile.beneficialOwnershipDeclarations[0].status,
              restrictedSummary: profile.beneficialOwnershipDeclarations[0].restrictedSummary,
            }
          : null
        : null,
      representativeAccessLimited: !access.hasFullOrganizationVisibility,
      disclaimer:
        'Corporate registry profile is informational and does not confer government authority.',
    };
  }

  async listFilings(organizationId: string, pagination: { page: number; pageSize: number }) {
    await this.lifecycleService.ensureProfileForOrganization(organizationId);
    const profile = await this.loadProfile(organizationId);
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where: Prisma.CorporateFilingWhereInput = { profileId: profile.id };

    const [items, totalItems] = await Promise.all([
      this.prisma.corporateFiling.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.corporateFiling.count({ where }),
    ]);

    return { items, totalItems };
  }

  async listOfficers(organizationId: string, access: BusinessOrganizationAccess) {
    const profile = await this.getCorporateProfile(organizationId, access);
    return profile.officers;
  }

  async listCertificates(organizationId: string) {
    await this.lifecycleService.ensureProfileForOrganization(organizationId);
    const profile = await this.loadProfile(organizationId);
    return profile.certificates;
  }

  async listCorporateActions(organizationId: string) {
    await this.lifecycleService.ensureProfileForOrganization(organizationId);
    const profile = await this.loadProfile(organizationId);
    return profile.actions;
  }
}
