import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SocialProtectionAppealReferenceService } from './appeals/social-protection-appeal-reference.service';
import { BenefitApplicationProfileService } from './applications/benefit-application-profile.service';
import { BenefitAwardService } from './awards/benefit-award.service';
import { BenefitSuspensionService } from './awards/benefit-suspension.service';
import { SocialProtectionAccessService } from './common/social-protection-access.service';
import { SocialProtectionBoundaryService } from './common/social-protection-boundary.service';
import { BenefitEligibilityAssessmentService } from './eligibility/benefit-eligibility-assessment.service';
import { ConfigurableBenefitEligibilityEngine } from './eligibility/configurable-benefit-eligibility.engine';
import { ExternalEligibilityDeterminationService } from './external/external-eligibility-determination.service';
import { HouseholdRecordService } from './households/household-record.service';
import { BenefitDisbursementReferenceService } from './payments/benefit-disbursement-reference.service';
import { BenefitApplicantProfileService } from './profiles/benefit-applicant-profile.service';
import { SocialProtectionController } from './social-protection.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialProtectionController],
  providers: [
    SocialProtectionBoundaryService,
    SocialProtectionAccessService,
    ConfigurableBenefitEligibilityEngine,
    BenefitApplicantProfileService,
    HouseholdRecordService,
    BenefitApplicationProfileService,
    BenefitEligibilityAssessmentService,
    BenefitAwardService,
    BenefitSuspensionService,
    ExternalEligibilityDeterminationService,
    SocialProtectionAppealReferenceService,
    BenefitDisbursementReferenceService,
  ],
  exports: [
    SocialProtectionBoundaryService,
    SocialProtectionAccessService,
    BenefitApplicantProfileService,
    HouseholdRecordService,
    BenefitApplicationProfileService,
    BenefitEligibilityAssessmentService,
    BenefitAwardService,
    BenefitSuspensionService,
    ExternalEligibilityDeterminationService,
    SocialProtectionAppealReferenceService,
    BenefitDisbursementReferenceService,
  ],
})
export class SocialProtectionModule {}
