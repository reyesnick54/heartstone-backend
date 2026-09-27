import { Injectable } from '@nestjs/common';
import {
  CorporateEntityType,
  CorporateFilingStatus,
  CorporateFilingType,
  CorporateOfficerRole,
  CorporateRegistryRecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorporateBeneficialOwnershipService } from '../beneficial-ownership/corporate-beneficial-ownership.service';
import { CorporateRegistryLifecycleService } from '../lifecycle/corporate-registry-lifecycle.service';

@Injectable()
export class CorporateRegistryOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: CorporateRegistryLifecycleService,
    private readonly beneficialOwnership: CorporateBeneficialOwnershipService,
  ) {}

  async submitRegistrationIntake(input: {
    organizationId: string;
    actorIdentityId: string;
    registeredName?: string;
    entityType?: CorporateEntityType;
    jurisdictionCode?: string;
  }) {
    const profile = await this.lifecycle.ensureProfileForOrganization(input.organizationId);

    const updated = await this.prisma.corporateRegistryProfile.update({
      where: { id: profile.id },
      data: {
        registeredName: input.registeredName ?? profile.registeredName,
        entityType: input.entityType ?? profile.entityType,
        jurisdictionCode: input.jurisdictionCode ?? profile.jurisdictionCode,
        recordApprovalStatus: CorporateRegistryRecordStatus.PENDING_REVIEW,
      },
    });

    const filing = await this.prisma.corporateFiling.create({
      data: {
        profileId: profile.id,
        filingType: CorporateFilingType.INITIAL,
        status: CorporateFilingStatus.SUBMITTED,
        label: 'Initial registration intake',
        submittedAt: new Date(),
      },
    });

    return { profile: updated, filing };
  }

  async submitAmendment(input: { organizationId: string; actorIdentityId: string; label: string }) {
    const profile = await this.lifecycle.ensureProfileForOrganization(input.organizationId);
    const filing = await this.prisma.corporateFiling.create({
      data: {
        profileId: profile.id,
        filingType: CorporateFilingType.AMENDMENT,
        status: CorporateFilingStatus.SUBMITTED,
        label: input.label,
        submittedAt: new Date(),
      },
    });
    return filing;
  }

  async submitOfficerDisclosure(input: {
    organizationId: string;
    displayName: string;
    role: CorporateOfficerRole;
    permitsPublicDisclosure?: boolean;
  }) {
    const profile = await this.lifecycle.ensureProfileForOrganization(input.organizationId);
    return this.prisma.corporateOfficerDisclosure.create({
      data: {
        profileId: profile.id,
        displayName: input.displayName,
        role: input.role,
        permitsPublicDisclosure: input.permitsPublicDisclosure ?? false,
        recordStatus: CorporateRegistryRecordStatus.PENDING_REVIEW,
      },
    });
  }

  async submitRegisteredOfficeChange(input: {
    organizationId: string;
    addressLine1: string;
    city?: string;
    countryCode?: string;
  }) {
    const profile = await this.lifecycle.ensureProfileForOrganization(input.organizationId);
    await this.lifecycle.supersedeRegisteredOffice(profile.id, input.addressLine1);
    return this.prisma.corporateRegisteredOffice.findFirst({
      where: { profileId: profile.id, isCurrent: true },
    });
  }

  async submitBeneficialOwnership(input: {
    organizationId: string;
    actorIdentityId: string;
    owners: Parameters<
      CorporateBeneficialOwnershipService['submitStructuredDeclaration']
    >[0]['owners'];
  }) {
    const profile = await this.lifecycle.ensureProfileForOrganization(input.organizationId);
    return this.beneficialOwnership.submitStructuredDeclaration({
      profileId: profile.id,
      changedByIdentityId: input.actorIdentityId,
      owners: input.owners,
    });
  }

  async getEntityStatus(organizationId: string, includeBeneficialOwnership = true) {
    const profile = await this.lifecycle.ensureProfileForOrganization(organizationId);
    const structuredOwners = includeBeneficialOwnership
      ? await this.beneficialOwnership.listActiveStructuredRecords(profile.id)
      : [];
    return {
      organizationId,
      profileId: profile.id,
      registrationStatus: profile.registrationStatus,
      recordApprovalStatus: profile.recordApprovalStatus,
      registeredName: profile.registeredName,
      registrationReference: profile.registrationReference,
      beneficialOwners: structuredOwners.map((owner) => ({
        beneficialOwnerRecordId: owner.id,
        ownerReference: owner.ownerReference,
        controlNature: owner.controlNature,
        ownershipPercentage: owner.ownershipPercentage?.toString() ?? null,
        verificationStatus: owner.verificationStatus,
        provenanceSource: owner.provenanceSource,
        effectiveFrom: owner.effectiveFrom.toISOString(),
      })),
    };
  }
}
