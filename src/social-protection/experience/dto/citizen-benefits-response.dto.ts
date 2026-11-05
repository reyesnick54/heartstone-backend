import { ApiProperty } from '@nestjs/swagger';
import {
  BenefitApplicationProfileStatus,
  BenefitAwardLifecycleStatus,
  BenefitCategoryKind,
  BenefitProgramStatus,
} from '@prisma/client';

export class CitizenBenefitActiveAwardDto {
  @ApiProperty()
  awardNumber!: string;

  @ApiProperty({ enum: BenefitAwardLifecycleStatus })
  lifecycleStatus!: BenefitAwardLifecycleStatus;
}

export class CitizenBenefitsHomeResponseDto {
  @ApiProperty()
  profileReferenceNumber!: string;

  @ApiProperty({ enum: ['NON_PRODUCTION'] })
  ruleEnvironment!: 'NON_PRODUCTION';

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  preliminaryMatchDisclaimer!: string;

  @ApiProperty()
  paymentDisclaimer!: string;

  @ApiProperty()
  pendingApplications!: number;

  @ApiProperty()
  preliminaryEligibilityAssessments!: number;

  @ApiProperty()
  preliminaryMatchingIsNotAuthoritativeEligibility!: boolean;

  @ApiProperty({ type: () => CitizenBenefitActiveAwardDto, nullable: true })
  activeAward!: CitizenBenefitActiveAwardDto | null;

  @ApiProperty()
  disbursementReferences!: number;

  @ApiProperty()
  renewalItemsTracked!: number;
}

export class CitizenBenefitProgramItemDto {
  @ApiProperty()
  programCode!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty({ enum: BenefitCategoryKind })
  categoryKind!: BenefitCategoryKind;

  @ApiProperty()
  preliminaryMatchingOnly!: boolean;

  @ApiProperty()
  isAuthoritativeEligibility!: boolean;
}

export class CitizenBenefitActionDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;
}

export class CitizenBenefitsActionsResponseDto {
  @ApiProperty()
  profileReferenceNumber!: string;

  @ApiProperty({ type: () => [CitizenBenefitActionDto] })
  availableActions!: CitizenBenefitActionDto[];
}

/** Scalar columns of a persisted `BenefitProgram` row as serialized to JSON. */
export class BenefitProgramRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  programCode!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty()
  benefitCategoryId!: string;

  @ApiProperty({ type: String, nullable: true })
  jurisdictionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  institutionId!: string | null;

  @ApiProperty({ enum: BenefitProgramStatus })
  status!: BenefitProgramStatus;

  @ApiProperty()
  doesNotEncodeEligibilityLaw!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `BenefitApplicationProfile` row as serialized to JSON. */
export class BenefitApplicationProfileRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  profileNumber!: string;

  @ApiProperty()
  benefitApplicantProfileId!: string;

  @ApiProperty()
  benefitProgramId!: string;

  @ApiProperty()
  benefitProgramVersionId!: string;

  @ApiProperty({ type: String, nullable: true })
  householdRecordId!: string | null;

  @ApiProperty()
  caseId!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: BenefitApplicationProfileStatus })
  status!: BenefitApplicationProfileStatus;

  @ApiProperty()
  doesNotCreateBenefitAward!: boolean;

  @ApiProperty()
  doesNotInferEligibility!: boolean;

  @ApiProperty()
  paymentDoesNotDetermineEligibility!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submissionAcknowledgedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `BenefitAward` row as serialized to JSON. */
export class BenefitAwardRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  awardNumber!: string;

  @ApiProperty({ type: String, nullable: true })
  benefitApplicationProfileId!: string | null;

  @ApiProperty()
  benefitProgramId!: string;

  @ApiProperty()
  benefitProgramVersionId!: string;

  @ApiProperty({ type: String, nullable: true })
  governmentDecisionId!: string | null;

  @ApiProperty({ enum: BenefitAwardLifecycleStatus })
  lifecycleStatus!: BenefitAwardLifecycleStatus;

  @ApiProperty({ type: String, nullable: true })
  currentBenefitAwardVersionId!: string | null;

  @ApiProperty()
  doesNotDetermineContinuingEligibility!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `BenefitDisbursementReference` row as serialized to JSON. */
export class BenefitDisbursementReferenceRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  benefitAwardId!: string;

  @ApiProperty()
  disbursementReference!: string;

  @ApiProperty({ type: String, nullable: true })
  paymentTransactionId!: string | null;

  @ApiProperty()
  doesNotDetermineEligibility!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  recordedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class CitizenBenefitApplicationItemDto extends BenefitApplicationProfileRecordDto {
  @ApiProperty({ type: () => BenefitProgramRecordDto })
  benefitProgram!: BenefitProgramRecordDto;
}
