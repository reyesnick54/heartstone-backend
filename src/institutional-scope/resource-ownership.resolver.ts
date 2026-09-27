import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  INSTITUTIONALLY_RESTRICTED_RESOURCE_TYPES,
  InstitutionalOwnership,
  ScopeDenialReason,
  ScopedResourceType,
} from './institutional-scope.types';

export interface OwnershipResolution {
  found: boolean;
  ownership?: InstitutionalOwnership;
  denialReason?: ScopeDenialReason;
}

@Injectable()
export class ResourceOwnershipResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    resourceType: ScopedResourceType,
    resourceId: string,
  ): Promise<OwnershipResolution> {
    switch (resourceType) {
      case ScopedResourceType.INSTITUTION:
        return this.resolveInstitution(resourceId);
      case ScopedResourceType.DEPARTMENT:
        return this.resolveDepartment(resourceId);
      case ScopedResourceType.OFFICE:
        return this.resolveOffice(resourceId);
      case ScopedResourceType.IDENTITY:
        return this.resolveIdentity(resourceId);
      case ScopedResourceType.ORGANIZATION:
        return this.resolveOrganization(resourceId);
      case ScopedResourceType.APPLICATION:
        return this.resolveApplication(resourceId);
      case ScopedResourceType.CASE:
        return this.resolveCase(resourceId);
      case ScopedResourceType.MASTER_ADMINISTRATIVE_FILE:
        return this.resolveMasterAdministrativeFile(resourceId);
      case ScopedResourceType.EVIDENCE_PACKET:
        return this.resolveEvidencePacket(resourceId);
      case ScopedResourceType.EVIDENCE_RECORD:
        return this.resolveEvidenceRecord(resourceId);
      case ScopedResourceType.OFFICIAL_INSTRUMENT:
        return this.resolveOfficialInstrument(resourceId);
      case ScopedResourceType.COMPLIANCE_MATTER:
        return this.resolveComplianceMatter(resourceId);
      case ScopedResourceType.CORPORATE_REGISTRY_PROFILE:
        return this.resolveCorporateRegistryProfile(resourceId);
      case ScopedResourceType.REDRESS_MATTER:
        return this.resolveRedressMatter(resourceId);
      case ScopedResourceType.DASHBOARD:
        return this.resolveDashboard(resourceId);
      case ScopedResourceType.STRATEGIC_PROJECT:
        return this.resolveStrategicProject(resourceId);
      case ScopedResourceType.GOVERNMENT_DECISION:
        return this.resolveGovernmentDecision(resourceId);
      case ScopedResourceType.IMMIGRATION_PROFILE:
        return this.resolveImmigrationProfile(resourceId);
      case ScopedResourceType.DRIVER_PROFILE:
        return this.resolveDriverProfile(resourceId);
      case ScopedResourceType.WORKER_PROFILE_REFERENCE:
        return this.resolveWorkerProfileReference(resourceId);
      case ScopedResourceType.STUDENT_EDUCATION_PROFILE:
        return this.resolveStudentEducationProfile(resourceId);
      case ScopedResourceType.VEHICLE_RECORD:
        return this.resolveVehicleRecord(resourceId);
      case ScopedResourceType.BENEFIT_AWARD:
        return this.resolveBenefitAward(resourceId);
      case ScopedResourceType.CUSTOMS_DECLARATION:
        return this.resolveCustomsDeclaration(resourceId);
      default:
        return { found: false, denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP };
    }
  }

  private restricted(resourceType: ScopedResourceType, ownership: InstitutionalOwnership): void {
    ownership.isRestricted = INSTITUTIONALLY_RESTRICTED_RESOURCE_TYPES.has(resourceType);
  }

  private validateInstitutionalLinkage(
    resourceType: ScopedResourceType,
    ownership: InstitutionalOwnership,
  ): ScopeDenialReason | undefined {
    this.restricted(resourceType, ownership);

    if (!ownership.isRestricted) {
      return undefined;
    }

    if (!ownership.institutionId && !ownership.applicantIdentityId && !ownership.holderIdentityId) {
      return ScopeDenialReason.MISSING_INSTITUTIONAL_LINKAGE;
    }

    return undefined;
  }

  private async resolveInstitution(resourceId: string): Promise<OwnershipResolution> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: resourceId },
      select: { id: true },
    });

    if (!institution) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = { institutionId: institution.id };
    this.restricted(ScopedResourceType.INSTITUTION, ownership);
    return { found: true, ownership };
  }

  private async resolveDepartment(resourceId: string): Promise<OwnershipResolution> {
    const department = await this.prisma.department.findUnique({
      where: { id: resourceId },
      select: { id: true, institutionId: true },
    });

    if (!department) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      departmentId: department.id,
      institutionId: department.institutionId,
    };
    this.restricted(ScopedResourceType.DEPARTMENT, ownership);
    return { found: true, ownership };
  }

  private async resolveOffice(resourceId: string): Promise<OwnershipResolution> {
    const office = await this.prisma.office.findUnique({
      where: { id: resourceId },
      select: { id: true, departmentId: true, department: { select: { institutionId: true } } },
    });

    if (!office) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      officeId: office.id,
      departmentId: office.departmentId,
      institutionId: office.department.institutionId,
    };
    this.restricted(ScopedResourceType.OFFICE, ownership);
    return { found: true, ownership };
  }

  private async resolveIdentity(resourceId: string): Promise<OwnershipResolution> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: resourceId },
      select: { id: true },
    });

    if (!identity) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    return {
      found: true,
      ownership: { applicantIdentityId: identity.id },
    };
  }

  private async resolveOrganization(resourceId: string): Promise<OwnershipResolution> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: resourceId },
      select: { id: true },
    });

    if (!organization) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    return {
      found: true,
      ownership: { organizationId: organization.id },
    };
  }

  private async resolveApplication(resourceId: string): Promise<OwnershipResolution> {
    const application = await this.prisma.application.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        applicantIdentityId: true,
        organizationId: true,
        representativeAuthorityId: true,
        case: {
          select: {
            id: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!application) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicationId: application.id,
      applicantIdentityId: application.applicantIdentityId,
      organizationId: application.organizationId ?? undefined,
      representativeAuthorityId: application.representativeAuthorityId ?? undefined,
      caseId: application.case?.id,
      institutionId: application.case?.responsibleInstitutionId,
      departmentId: application.case?.responsibleDepartmentId,
    };

    const linkageIssue = this.validateInstitutionalLinkage(
      ScopedResourceType.APPLICATION,
      ownership,
    );
    if (linkageIssue) {
      return { found: true, ownership, denialReason: linkageIssue };
    }

    return { found: true, ownership };
  }

  private async resolveCase(resourceId: string): Promise<OwnershipResolution> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        applicantIdentityId: true,
        applicationId: true,
        responsibleInstitutionId: true,
        responsibleDepartmentId: true,
        masterAdministrativeFile: { select: { id: true } },
      },
    });

    if (!caseRecord) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      caseId: caseRecord.id,
      applicationId: caseRecord.applicationId,
      applicantIdentityId: caseRecord.applicantIdentityId,
      institutionId: caseRecord.responsibleInstitutionId,
      departmentId: caseRecord.responsibleDepartmentId,
      masterAdministrativeFileId: caseRecord.masterAdministrativeFile?.id,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveMasterAdministrativeFile(resourceId: string): Promise<OwnershipResolution> {
    const file = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        applicationId: true,
        responsibleInstitutionId: true,
        responsibleDepartmentId: true,
        case: { select: { applicantIdentityId: true } },
      },
    });

    if (!file) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      masterAdministrativeFileId: file.id,
      caseId: file.caseId,
      applicationId: file.applicationId,
      applicantIdentityId: file.case.applicantIdentityId,
      institutionId: file.responsibleInstitutionId,
      departmentId: file.responsibleDepartmentId,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveEvidencePacket(resourceId: string): Promise<OwnershipResolution> {
    const packet = await this.prisma.evidencePacket.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        masterAdministrativeFileId: true,
        responsibleDepartmentId: true,
        responsibleDepartment: { select: { institutionId: true } },
        case: { select: { applicantIdentityId: true } },
      },
    });

    if (!packet) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      caseId: packet.caseId ?? undefined,
      masterAdministrativeFileId: packet.masterAdministrativeFileId,
      departmentId: packet.responsibleDepartmentId,
      institutionId: packet.responsibleDepartment.institutionId,
      applicantIdentityId: packet.case?.applicantIdentityId,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveEvidenceRecord(resourceId: string): Promise<OwnershipResolution> {
    const record = await this.prisma.evidenceRecord.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        masterAdministrativeFileId: true,
        case: {
          select: {
            applicantIdentityId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!record) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      caseId: record.caseId,
      masterAdministrativeFileId: record.masterAdministrativeFileId,
      applicantIdentityId: record.case.applicantIdentityId,
      institutionId: record.case.responsibleInstitutionId,
      departmentId: record.case.responsibleDepartmentId,
      isRestricted: true,
    };

    if (!ownership.institutionId && !ownership.applicantIdentityId) {
      return { found: true, ownership, denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP };
    }

    return { found: true, ownership };
  }

  private async resolveOfficialInstrument(resourceId: string): Promise<OwnershipResolution> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        masterAdministrativeFileId: true,
        holderIdentityId: true,
        holderOrganizationId: true,
        case: {
          select: {
            applicantIdentityId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!instrument) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      caseId: instrument.caseId ?? undefined,
      masterAdministrativeFileId: instrument.masterAdministrativeFileId ?? undefined,
      holderIdentityId: instrument.holderIdentityId ?? undefined,
      organizationId: instrument.holderOrganizationId ?? undefined,
      applicantIdentityId: instrument.holderIdentityId ?? instrument.case?.applicantIdentityId,
      institutionId: instrument.case?.responsibleInstitutionId,
      departmentId: instrument.case?.responsibleDepartmentId,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveComplianceMatter(resourceId: string): Promise<OwnershipResolution> {
    const matter = await this.prisma.complianceMatter.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        masterAdministrativeFileId: true,
        holderIdentityId: true,
        holderOrganizationId: true,
        responsibleInstitutionId: true,
        responsibleDepartmentId: true,
      },
    });

    if (!matter) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      caseId: matter.caseId ?? undefined,
      masterAdministrativeFileId: matter.masterAdministrativeFileId,
      holderIdentityId: matter.holderIdentityId ?? undefined,
      organizationId: matter.holderOrganizationId ?? undefined,
      institutionId: matter.responsibleInstitutionId,
      departmentId: matter.responsibleDepartmentId,
      applicantIdentityId: matter.holderIdentityId ?? undefined,
      isRestricted: true,
    };

    if (!ownership.institutionId) {
      return {
        found: true,
        ownership,
        denialReason: ScopeDenialReason.MISSING_INSTITUTIONAL_LINKAGE,
      };
    }

    return { found: true, ownership };
  }

  private async resolveCorporateRegistryProfile(resourceId: string): Promise<OwnershipResolution> {
    const profile = await this.prisma.corporateRegistryProfile.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!profile) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    return {
      found: true,
      ownership: {
        organizationId: profile.organizationId,
      },
    };
  }

  private async resolveRedressMatter(resourceId: string): Promise<OwnershipResolution> {
    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        masterAdministrativeFileId: true,
        appellantIdentityId: true,
        case: {
          select: {
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!matter) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      caseId: matter.caseId ?? undefined,
      masterAdministrativeFileId: matter.masterAdministrativeFileId ?? undefined,
      applicantIdentityId: matter.appellantIdentityId ?? undefined,
      institutionId: matter.case?.responsibleInstitutionId,
      departmentId: matter.case?.responsibleDepartmentId,
      isRestricted: true,
    };

    if (!ownership.institutionId && !ownership.applicantIdentityId) {
      return { found: true, ownership, denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP };
    }

    return { found: true, ownership };
  }

  private async resolveDashboard(resourceId: string): Promise<OwnershipResolution> {
    const dashboard = await this.prisma.dashboardDefinition.findUnique({
      where: { id: resourceId },
      select: { id: true, institutionId: true, departmentId: true },
    });

    if (!dashboard) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    if (!dashboard.institutionId && !dashboard.departmentId) {
      return {
        found: true,
        ownership: { isRestricted: true },
        denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP,
      };
    }

    let institutionId = dashboard.institutionId ?? undefined;
    if (!institutionId && dashboard.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dashboard.departmentId },
        select: { institutionId: true },
      });
      institutionId = department?.institutionId;
    }

    const ownership: InstitutionalOwnership = {
      institutionId,
      departmentId: dashboard.departmentId ?? undefined,
      isRestricted: true,
    };

    if (!ownership.institutionId) {
      return { found: true, ownership, denialReason: ScopeDenialReason.AMBIGUOUS_SCOPE };
    }

    return { found: true, ownership };
  }

  private async resolveStrategicProject(resourceId: string): Promise<OwnershipResolution> {
    const project = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        sponsoringInstitutionId: true,
        responsibleDepartmentId: true,
        caseId: true,
        case: { select: { applicantIdentityId: true } },
      },
    });

    if (!project) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      institutionId: project.sponsoringInstitutionId,
      departmentId: project.responsibleDepartmentId,
      caseId: project.caseId ?? undefined,
      applicantIdentityId: project.case?.applicantIdentityId,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveGovernmentDecision(resourceId: string): Promise<OwnershipResolution> {
    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        caseId: true,
        masterAdministrativeFileId: true,
        case: {
          select: {
            applicantIdentityId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!decision) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    if (!decision.case) {
      return { found: true, denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP };
    }

    const ownership: InstitutionalOwnership = {
      caseId: decision.caseId ?? undefined,
      masterAdministrativeFileId: decision.masterAdministrativeFileId ?? undefined,
      applicantIdentityId: decision.case.applicantIdentityId,
      institutionId: decision.case.responsibleInstitutionId,
      departmentId: decision.case.responsibleDepartmentId,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveImmigrationProfile(resourceId: string): Promise<OwnershipResolution> {
    const profile = await this.prisma.immigrationProfile.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        subjectIdentityId: true,
        masterAdministrativeFileId: true,
        masterAdministrativeFile: {
          select: {
            caseId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
            case: { select: { applicantIdentityId: true } },
          },
        },
      },
    });

    if (!profile) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicantIdentityId: profile.subjectIdentityId,
      holderIdentityId: profile.subjectIdentityId,
      masterAdministrativeFileId: profile.masterAdministrativeFileId ?? undefined,
      caseId: profile.masterAdministrativeFile?.caseId,
      institutionId: profile.masterAdministrativeFile?.responsibleInstitutionId,
      departmentId: profile.masterAdministrativeFile?.responsibleDepartmentId,
    };

    return { found: true, ownership };
  }

  private async resolveDriverProfile(resourceId: string): Promise<OwnershipResolution> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        subjectIdentityId: true,
        masterAdministrativeFileId: true,
        masterAdministrativeFile: {
          select: {
            caseId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!profile) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicantIdentityId: profile.subjectIdentityId,
      holderIdentityId: profile.subjectIdentityId,
      masterAdministrativeFileId: profile.masterAdministrativeFileId ?? undefined,
      caseId: profile.masterAdministrativeFile?.caseId,
      institutionId: profile.masterAdministrativeFile?.responsibleInstitutionId,
      departmentId: profile.masterAdministrativeFile?.responsibleDepartmentId,
    };

    return { found: true, ownership };
  }

  private async resolveWorkerProfileReference(resourceId: string): Promise<OwnershipResolution> {
    const profile = await this.prisma.workerProfileReference.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        workerIdentityId: true,
        masterAdministrativeFileId: true,
        masterAdministrativeFile: {
          select: {
            caseId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!profile) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicantIdentityId: profile.workerIdentityId,
      holderIdentityId: profile.workerIdentityId,
      masterAdministrativeFileId: profile.masterAdministrativeFileId ?? undefined,
      caseId: profile.masterAdministrativeFile?.caseId,
      institutionId: profile.masterAdministrativeFile?.responsibleInstitutionId,
      departmentId: profile.masterAdministrativeFile?.responsibleDepartmentId,
    };

    return { found: true, ownership };
  }

  private async resolveStudentEducationProfile(resourceId: string): Promise<OwnershipResolution> {
    const profile = await this.prisma.studentEducationProfile.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        studentIdentityId: true,
        masterAdministrativeFileId: true,
        masterAdministrativeFile: {
          select: {
            caseId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!profile) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicantIdentityId: profile.studentIdentityId,
      holderIdentityId: profile.studentIdentityId,
      masterAdministrativeFileId: profile.masterAdministrativeFileId ?? undefined,
      caseId: profile.masterAdministrativeFile?.caseId,
      institutionId: profile.masterAdministrativeFile?.responsibleInstitutionId,
      departmentId: profile.masterAdministrativeFile?.responsibleDepartmentId,
    };

    return { found: true, ownership };
  }

  private async resolveVehicleRecord(resourceId: string): Promise<OwnershipResolution> {
    const vehicle = await this.prisma.vehicleRecord.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        masterAdministrativeFileId: true,
        masterAdministrativeFile: {
          select: {
            caseId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
            case: { select: { applicantIdentityId: true } },
          },
        },
        currentOwnershipRecord: {
          select: { ownerIdentityId: true, ownerOrganizationId: true },
        },
      },
    });

    if (!vehicle) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicantIdentityId:
        vehicle.currentOwnershipRecord?.ownerIdentityId ??
        vehicle.masterAdministrativeFile?.case.applicantIdentityId,
      holderIdentityId: vehicle.currentOwnershipRecord?.ownerIdentityId ?? undefined,
      organizationId: vehicle.currentOwnershipRecord?.ownerOrganizationId ?? undefined,
      masterAdministrativeFileId: vehicle.masterAdministrativeFileId ?? undefined,
      caseId: vehicle.masterAdministrativeFile?.caseId,
      institutionId: vehicle.masterAdministrativeFile?.responsibleInstitutionId,
      departmentId: vehicle.masterAdministrativeFile?.responsibleDepartmentId,
    };

    return { found: true, ownership };
  }

  private async resolveBenefitAward(resourceId: string): Promise<OwnershipResolution> {
    const award = await this.prisma.benefitAward.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        benefitApplicationProfile: {
          select: {
            applicationId: true,
            caseId: true,
            benefitApplicantProfile: { select: { primaryApplicantIdentityId: true } },
            case: {
              select: {
                responsibleInstitutionId: true,
                responsibleDepartmentId: true,
              },
            },
          },
        },
      },
    });

    if (!award) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const profile = award.benefitApplicationProfile;
    if (!profile) {
      return { found: true, denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP };
    }

    const ownership: InstitutionalOwnership = {
      applicationId: profile.applicationId,
      caseId: profile.caseId,
      applicantIdentityId: profile.benefitApplicantProfile.primaryApplicantIdentityId,
      institutionId: profile.case.responsibleInstitutionId,
      departmentId: profile.case.responsibleDepartmentId,
      isRestricted: true,
    };

    return { found: true, ownership };
  }

  private async resolveCustomsDeclaration(resourceId: string): Promise<OwnershipResolution> {
    const declaration = await this.prisma.customsDeclaration.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        applicationId: true,
        caseId: true,
        traderAccount: { select: { organizationId: true } },
        case: {
          select: {
            applicantIdentityId: true,
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!declaration) {
      return { found: false, denialReason: ScopeDenialReason.RESOURCE_NOT_FOUND };
    }

    const ownership: InstitutionalOwnership = {
      applicationId: declaration.applicationId ?? undefined,
      caseId: declaration.caseId ?? undefined,
      organizationId: declaration.traderAccount.organizationId ?? undefined,
      applicantIdentityId: declaration.case?.applicantIdentityId,
      institutionId: declaration.case?.responsibleInstitutionId,
      departmentId: declaration.case?.responsibleDepartmentId,
    };

    return { found: true, ownership };
  }
}
