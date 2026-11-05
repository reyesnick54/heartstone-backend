import { ApiProperty } from '@nestjs/swagger';
import {
  AcademicCredentialLifecycleStatus,
  EducationAdmissionApplicationProfileStatus,
  EnrollmentRecordStatus,
  ScholarshipApplicationProfileStatus,
} from '@prisma/client';

export class CitizenEducationHomeResponseDto {
  @ApiProperty()
  ruleEnvironment!: string;

  @ApiProperty()
  servicePackId!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  accessibleStudentProfiles!: number;

  @ApiProperty()
  activeEnrollments!: number;
}

export class CitizenEducationEnrollmentItemDto {
  @ApiProperty()
  enrollmentReference!: string;

  @ApiProperty({ enum: EnrollmentRecordStatus })
  status!: EnrollmentRecordStatus;

  @ApiProperty()
  institutionCode!: string;

  @ApiProperty()
  institutionName!: string;
}

export class CitizenEducationCredentialItemDto {
  @ApiProperty()
  credentialReference!: string;

  @ApiProperty({ enum: AcademicCredentialLifecycleStatus })
  lifecycleStatus!: AcademicCredentialLifecycleStatus;
}

export class CitizenEducationEnrollmentApplicationDto {
  @ApiProperty()
  profileNumber!: string;

  @ApiProperty({ enum: EducationAdmissionApplicationProfileStatus })
  status!: EducationAdmissionApplicationProfileStatus;

  @ApiProperty()
  doesNotCreateEnrollment!: boolean;
}

export class CitizenEducationScholarshipApplicationDto {
  @ApiProperty()
  profileNumber!: string;

  @ApiProperty({ enum: ScholarshipApplicationProfileStatus })
  status!: ScholarshipApplicationProfileStatus;

  @ApiProperty()
  doesNotCreateAward!: boolean;

  @ApiProperty()
  aiRecommendationIsNotDecision!: boolean;
}

export class CitizenEducationApplicationsResponseDto {
  @ApiProperty({ type: () => [CitizenEducationEnrollmentApplicationDto] })
  enrollmentApplications!: CitizenEducationEnrollmentApplicationDto[];

  @ApiProperty({ type: () => [CitizenEducationScholarshipApplicationDto] })
  scholarshipApplications!: CitizenEducationScholarshipApplicationDto[];
}

export class CitizenEducationSupportScholarshipDto {
  @ApiProperty()
  profileNumber!: string;

  @ApiProperty()
  doesNotCreateAward!: boolean;

  @ApiProperty()
  aiRecommendationIsNotDecision!: boolean;
}

export class CitizenEducationSupportResponseDto {
  @ApiProperty({ type: () => [CitizenEducationSupportScholarshipDto] })
  scholarshipApplications!: CitizenEducationSupportScholarshipDto[];

  @ApiProperty({
    type: 'array',
    items: {},
    description: 'Grant applications are not yet projected; always an empty list',
  })
  grantApplications!: never[];
}

export class CitizenEducationActionDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;
}

export class CitizenEducationActionsResponseDto {
  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: () => [CitizenEducationActionDto] })
  actions!: CitizenEducationActionDto[];

  @ApiProperty({ type: [String] })
  forbiddenSelfServiceActions!: string[];
}
