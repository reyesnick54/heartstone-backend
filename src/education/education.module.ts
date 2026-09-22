import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { EducationAccreditationService } from './applications/education-accreditation.service';
import { EducationEnrollmentApplicationService } from './applications/education-enrollment-application.service';
import { ScholarshipApplicationService } from './applications/scholarship-application.service';
import { ScholarshipAwardService } from './applications/scholarship-award.service';
import { EducationAccessService } from './common/education-access.service';
import { EducationBoundaryService } from './common/education-boundary.service';
import { EducationRecordCorrectionService } from './corrections/education-record-correction.service';
import { EducationController } from './education.controller';
import { CitizenEducationController } from './experience/citizen-education.controller';
import { EducationExperienceBoundaryService } from './experience/education-experience-boundary.service';
import { OfficialEducationController } from './experience/official-education.controller';
import { CitizenEducationProjectionService } from './experience/services/citizen-education-projection.service';
import { EducationScopeService } from './experience/services/education-scope.service';
import { OfficialEducationProjectionService } from './experience/services/official-education-projection.service';
import { EducationExternalDependencyService } from './external/education-external-dependency.service';
import { EducationInstitutionRegistryService } from './profiles/education-institution-registry.service';
import { EducationStudentProfileService } from './profiles/education-student-profile.service';
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
    EducationStudentProfileService,
    EducationInstitutionRegistryService,
    EducationEnrollmentApplicationService,
    ScholarshipApplicationService,
    ScholarshipAwardService,
    EducationAccreditationService,
    EducationRecordCorrectionService,
    EducationExternalDependencyService,
    PublicEducationVerificationService,
  ],
  exports: [
    EducationBoundaryService,
    EducationAccessService,
    EducationExperienceBoundaryService,
    EducationScopeService,
    EducationStudentProfileService,
    EducationInstitutionRegistryService,
    EducationEnrollmentApplicationService,
    ScholarshipApplicationService,
    ScholarshipAwardService,
    EducationAccreditationService,
    EducationRecordCorrectionService,
    EducationExternalDependencyService,
    PublicEducationVerificationService,
  ],
})
export class EducationModule {}
