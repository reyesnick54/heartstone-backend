import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { EDUCATION_SERVICE_PACK_ID } from '../../education.constants';
import { EducationExperienceBoundaryService } from '../education-experience-boundary.service';
import { EducationScopeService } from './education-scope.service';

@Injectable()
export class CitizenEducationProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EducationScopeService,
    private readonly boundary: EducationExperienceBoundaryService,
  ) {}

  async getHome(identityId: string) {
    const studentProfileIds = await this.scope.resolveAccessibleStudentProfileIds(identityId);
    const enrollments = await this.prisma.educationEnrollmentRecord.count({
      where: { studentProfileId: { in: studentProfileIds } },
    });

    return {
      ruleEnvironment: this.boundary.ruleEnvironment,
      servicePackId: EDUCATION_SERVICE_PACK_ID,
      disclaimer: this.boundary.disclaimer,
      accessibleStudentProfiles: studentProfileIds.length,
      activeEnrollments: enrollments,
    };
  }

  async listEnrollments(identityId: string) {
    const studentProfileIds = await this.scope.resolveAccessibleStudentProfileIds(identityId);
    const enrollments = await this.prisma.educationEnrollmentRecord.findMany({
      where: { studentProfileId: { in: studentProfileIds } },
      include: { institutionOrganization: { select: { code: true, name: true } } },
      take: 50,
    });

    return enrollments.map((enrollment) =>
      this.boundary.sanitizeCitizenPayload({
        enrollmentReference: enrollment.enrollmentReference,
        status: enrollment.status,
        institutionCode: enrollment.institutionOrganization.code,
        institutionName: enrollment.institutionOrganization.name,
      }),
    );
  }

  async listCredentials(identityId: string) {
    const studentProfileIds = await this.scope.resolveAccessibleStudentProfileIds(identityId);
    const credentials = await this.prisma.educationCredentialReference.findMany({
      where: { studentProfileId: { in: studentProfileIds } },
      take: 50,
    });

    return credentials.map((credential) =>
      this.boundary.sanitizeCitizenPayload({
        credentialReference: credential.credentialReference,
        credentialTypeCode: credential.credentialTypeCode,
        isGovernmentRecognized: credential.isGovernmentRecognized,
      }),
    );
  }

  async listApplications(identityId: string) {
    const studentProfileIds = await this.scope.resolveAccessibleStudentProfileIds(identityId);
    const [enrollmentApps, scholarshipApps] = await Promise.all([
      this.prisma.educationEnrollmentApplicationProfile.findMany({
        where: { studentProfileId: { in: studentProfileIds } },
        take: 50,
      }),
      this.prisma.scholarshipApplicationProfile.findMany({
        where: { studentProfileId: { in: studentProfileIds } },
        take: 50,
      }),
    ]);

    return {
      enrollmentApplications: enrollmentApps.map((app) => ({
        profileNumber: app.profileNumber,
        status: app.status,
        doesNotGrantEnrollment: app.doesNotGrantEnrollment,
      })),
      scholarshipApplications: scholarshipApps.map((app) => ({
        profileNumber: app.profileNumber,
        status: app.status,
        doesNotCreateAward: app.doesNotCreateAward,
        recommendationOnly: app.recommendationOnly,
      })),
    };
  }

  async listSupport(identityId: string) {
    const studentProfileIds = await this.scope.resolveAccessibleStudentProfileIds(identityId);
    const grants = await this.prisma.educationGrantApplicationProfile.findMany({
      where: {
        case: { applicantIdentityId: identityId },
      },
      take: 25,
    });

    const scholarships = await this.prisma.scholarshipApplicationProfile.findMany({
      where: { studentProfileId: { in: studentProfileIds } },
      include: { awardRecord: true },
      take: 25,
    });

    return {
      scholarshipApplications: scholarships.map((item) => ({
        profileNumber: item.profileNumber,
        awardStatus: item.awardRecord?.status ?? 'NOT_AWARDED',
        recommendationOnly: item.recommendationOnly,
      })),
      grantApplications: grants.map((grant) => ({
        profileNumber: grant.profileNumber,
        doesNotGrantFunds: grant.doesNotGrantFunds,
      })),
    };
  }

  listActions(identityId: string) {
    return {
      identityId,
      disclaimer: this.boundary.disclaimer,
      actions: [
        { actionKey: 'submit_enrollment_application', label: 'Submit enrollment application' },
        { actionKey: 'request_transcript', label: 'Request transcript / academic record' },
        { actionKey: 'submit_record_correction', label: 'Request education record correction' },
      ],
      forbiddenSelfServiceActions: [
        'grant_admission',
        'award_scholarship',
        'issue_credential',
        'self_accredit_institution',
      ],
    };
  }
}
