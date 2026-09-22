import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AcademicCredentialService } from './academic/academic-credential.service';
import { TranscriptRecordService } from './academic/transcript-record.service';
import { EducationAdmissionApplicationProfileService } from './admissions/education-admission-application-profile.service';
import { EducationAccessService } from './common/education-access.service';
import { EducationBoundaryService } from './common/education-boundary.service';
import { EducationController } from './education.controller';
import { EnrollmentRecordService } from './enrollment/enrollment-record.service';
import { CitizenEducationController } from './experience/citizen-education.controller';
import { EducationExperienceBoundaryService } from './experience/education-experience-boundary.service';
import { OfficialEducationController } from './experience/official-education.controller';
import { CitizenEducationProjectionService } from './experience/services/citizen-education-projection.service';
import { EducationScopeService } from './experience/services/education-scope.service';
import { OfficialEducationProjectionService } from './experience/services/official-education-projection.service';
import { EducationInstitutionService } from './institutions/education-institution.service';
import { ScholarshipApplicationProfileService } from './scholarships/scholarship-application-profile.service';
import { StudentEducationProfileService } from './students/student-education-profile.service';
import { PublicEducationVerificationController } from './verification/public-education-verification.controller';
import { PublicEducationVerificationService } from './verification/public-education-verification.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, AuthorityModule],
  controllers: [
    EducationController,
    CitizenEducationController,
    OfficialEducationController,
    PublicEducationVerificationController,
  ],
  providers: [
    EducationBoundaryService,
    EducationAccessService,
    EducationExperienceBoundaryService,
    EducationScopeService,
    CitizenEducationProjectionService,
    OfficialEducationProjectionService,
    EducationInstitutionService,
    StudentEducationProfileService,
    EducationAdmissionApplicationProfileService,
    ScholarshipApplicationProfileService,
    EnrollmentRecordService,
    TranscriptRecordService,
    AcademicCredentialService,
    PublicEducationVerificationService,
  ],
  exports: [
    EducationBoundaryService,
    EducationAccessService,
    EducationExperienceBoundaryService,
    EducationScopeService,
    EducationInstitutionService,
    StudentEducationProfileService,
    EducationAdmissionApplicationProfileService,
    ScholarshipApplicationProfileService,
    EnrollmentRecordService,
    TranscriptRecordService,
    AcademicCredentialService,
    PublicEducationVerificationService,
  ],
})
export class EducationModule {}
