import { Injectable } from '@nestjs/common';
import {
  CaseSlaClockStatus,
  CaseStatus,
  EducationAccreditationStatus,
  EducationEnrollmentApplicationProfileStatus,
  EducationInstitutionRegistrationStatus,
  EducationRecordCorrectionStatus,
  ScholarshipApplicationProfileStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { EducationExperienceBoundaryService } from '../education-experience-boundary.service';
import { EducationScopeService } from './education-scope.service';

@Injectable()
export class OfficialEducationProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EducationScopeService,
    private readonly boundary: EducationExperienceBoundaryService,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return this.emptyWorkspace();
    }

    const caseWhere = this.scope.buildOfficialCaseWhere(context.scope.departmentIds);

    const [
      studentEnrollmentMatters,
      institutionRegistrations,
      institutionLicensing,
      accreditation,
      educatorLicensing,
      scholarships,
      grants,
      inspectionMatters,
      recordCorrections,
      appeals,
      slaRisk,
    ] = await Promise.all([
      this.prisma.educationEnrollmentApplicationProfile.count({
        where: { case: caseWhere, status: EducationEnrollmentApplicationProfileStatus.ACTIVE },
      }),
      this.prisma.educationInstitutionRegistryRecord.count({
        where: { registrationStatus: EducationInstitutionRegistrationStatus.REGISTRATION_PENDING },
      }),
      this.prisma.educationInstitutionLicenseRecord.count({
        where: { lifecycleStatus: 'APPLICATION_PENDING' },
      }),
      this.prisma.educationAccreditationRecord.count({
        where: { status: EducationAccreditationStatus.APPLICATION_PENDING },
      }),
      this.prisma.educatorLicenseRecord.count({
        where: { lifecycleStatus: 'APPLICATION_PENDING' },
      }),
      this.prisma.scholarshipApplicationProfile.count({
        where: { case: caseWhere, status: ScholarshipApplicationProfileStatus.ACTIVE },
      }),
      this.prisma.educationGrantApplicationProfile.count({ where: { case: caseWhere } }),
      this.prisma.educationInstitutionInspectionReference.count(),
      this.prisma.educationRecordCorrection.count({
        where: { status: EducationRecordCorrectionStatus.UNDER_REVIEW },
      }),
      this.prisma.redressMatter.count({
        where: { case: caseWhere, closedAt: null },
      }),
      this.prisma.caseSlaClock.count({
        where: {
          case: caseWhere,
          status: CaseSlaClockStatus.BREACHED,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.disclaimer,
      aiDisclaimer: this.boundary.aiDisclaimer,
      queues: {
        studentEnrollmentMatters,
        institutionRegistrations,
        institutionLicensing,
        accreditation,
        educatorLicensing,
        scholarships,
        grants,
        inspectionMatters,
        recordCorrections,
        appeals,
        slaRisk,
      },
      intakeBacklog: await this.prisma.case.count({
        where: {
          ...caseWhere,
          status: { in: [CaseStatus.RECEIVED, CaseStatus.INTAKE] },
        },
      }),
    };
  }

  private emptyWorkspace() {
    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.disclaimer,
      queues: {},
      intakeBacklog: 0,
    };
  }
}
