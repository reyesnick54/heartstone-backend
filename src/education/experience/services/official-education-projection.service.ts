import { Injectable } from '@nestjs/common';
import { CaseSlaClockStatus, CaseStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { EDUCATION_SERVICE_PACK_ID } from '../../education.constants';
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
      admissionApplications,
      institutionRegistrations,
      institutionLicenses,
      accreditations,
      educatorLicenses,
      scholarshipApplications,
      inspectionReferences,
      transcriptCorrections,
      appeals,
      slaRisk,
    ] = await Promise.all([
      this.prisma.educationAdmissionApplicationProfile.count({ where: { case: caseWhere } }),
      this.prisma.educationInstitutionRegistration.count({ where: { case: caseWhere } }),
      this.prisma.educationInstitutionLicense.count(),
      this.prisma.educationInstitutionAccreditation.count(),
      this.prisma.educatorLicenseRecord.count(),
      this.prisma.scholarshipApplicationProfile.count({ where: { case: caseWhere } }),
      this.prisma.educationInspectionReference.count(),
      this.prisma.transcriptRecordCorrectionHistory.count(),
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
      servicePackId: EDUCATION_SERVICE_PACK_ID,
      disclaimer: this.boundary.disclaimer,
      aiDisclaimer: this.boundary.aiDisclaimer,
      queues: {
        admissionApplications,
        institutionRegistrations,
        institutionLicenses,
        accreditations,
        educatorLicenses,
        scholarshipApplications,
        inspectionReferences,
        transcriptCorrections,
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
