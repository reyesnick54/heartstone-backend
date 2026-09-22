import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AcademicCredentialService } from './academic/academic-credential.service';
import { TranscriptRecordService } from './academic/transcript-record.service';
import { EducationAdmissionApplicationProfileService } from './admissions/education-admission-application-profile.service';
import { EducationAccessService } from './common/education-access.service';
import { EducationBoundaryService } from './common/education-boundary.service';
import { EducationController } from './education.controller';
import { EnrollmentRecordService } from './enrollment/enrollment-record.service';
import { EducationInstitutionService } from './institutions/education-institution.service';
import { ScholarshipApplicationProfileService } from './scholarships/scholarship-application-profile.service';
import { StudentEducationProfileService } from './students/student-education-profile.service';
import { PublicEducationVerificationController } from './verification/public-education-verification.controller';
import { PublicEducationVerificationService } from './verification/public-education-verification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EducationController, PublicEducationVerificationController],
  providers: [
    EducationBoundaryService,
    EducationAccessService,
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
