import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { EducationExperienceBoundaryService } from '../../../education/experience/education-experience-boundary.service';
import { BusinessEducationAccessService } from './business-education-access.service';

@Injectable()
export class BusinessEducationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessEducationAccessService,
    private readonly boundary: EducationExperienceBoundaryService,
  ) {}

  private async requireInstitution(identityId: string, organizationId: string) {
    await this.access.assertOrganizationEducationAccess(identityId, organizationId);
    return this.prisma.educationInstitution.findFirst({
      where: { organizationId },
    });
  }

  async getHome(identityId: string, organizationId: string) {
    const institution = await this.requireInstitution(identityId, organizationId);
    return {
      organizationId,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.disclaimer,
      institutionRegistryReference: institution?.institutionReferenceNumber ?? null,
      registrationStatus: institution?.operationalStatus ?? 'NOT_REGISTERED',
    };
  }

  async listLicensing(identityId: string, organizationId: string) {
    const institution = await this.requireInstitution(identityId, organizationId);
    if (!institution) {
      return [];
    }
    return this.prisma.educationInstitutionLicense.findMany({
      where: { educationInstitutionId: institution.id },
      take: 50,
    });
  }

  async listAccreditation(identityId: string, organizationId: string) {
    const institution = await this.requireInstitution(identityId, organizationId);
    if (!institution) {
      return [];
    }
    return this.prisma.educationInstitutionAccreditation.findMany({
      where: { educationInstitutionId: institution.id },
      take: 50,
    });
  }

  async listInspections(identityId: string, organizationId: string) {
    const institution = await this.requireInstitution(identityId, organizationId);
    if (!institution) {
      return [];
    }
    return this.prisma.educationInspectionReference.findMany({
      where: { educationInstitutionId: institution.id },
      take: 50,
    });
  }

  async listActions(identityId: string, organizationId: string) {
    await this.requireInstitution(identityId, organizationId);
    return {
      disclaimer: this.boundary.disclaimer,
      actions: [
        {
          actionKey: 'submit_institution_license_application',
          label: 'Apply for institution license',
        },
        { actionKey: 'submit_accreditation_application', label: 'Apply for accreditation' },
        { actionKey: 'respond_inspection_findings', label: 'Respond to inspection findings' },
      ],
      forbiddenSelfServiceActions: ['self_accredit', 'self_license_without_authority'],
    };
  }
}
