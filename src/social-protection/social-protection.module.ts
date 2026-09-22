import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { SocialProtectionAppealReferenceService } from './appeals/social-protection-appeal-reference.service';
import { BenefitApplicationProfileService } from './applications/benefit-application-profile.service';
import { BenefitAwardService } from './awards/benefit-award.service';
import { BenefitSuspensionService } from './awards/benefit-suspension.service';
import { SocialProtectionAccessService } from './common/social-protection-access.service';
import { SocialProtectionBoundaryService } from './common/social-protection-boundary.service';
import { BenefitEligibilityAssessmentService } from './eligibility/benefit-eligibility-assessment.service';
import { ConfigurableBenefitEligibilityEngine } from './eligibility/configurable-benefit-eligibility.engine';
import { CitizenBenefitsController } from './experience/citizen-benefits.controller';
import { OfficialBenefitsController } from './experience/official-benefits.controller';
import { BenefitScopeService } from './experience/services/benefit-scope.service';
import { CitizenBenefitsProjectionService } from './experience/services/citizen-benefits-projection.service';
import { OfficialBenefitsProjectionService } from './experience/services/official-benefits-projection.service';
import { SocialProtectionExperienceBoundaryService } from './experience/social-protection-experience-boundary.service';
import { ExternalEligibilityDeterminationService } from './external/external-eligibility-determination.service';
import { HouseholdRecordService } from './households/household-record.service';
import { BenefitDisbursementReferenceService } from './payments/benefit-disbursement-reference.service';
import { BenefitApplicantProfileService } from './profiles/benefit-applicant-profile.service';
import { BenefitProgramDiscoveryService } from './programs/benefit-program-discovery.service';
import { SocialProtectionController } from './social-protection.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, AuthorityModule],
  controllers: [SocialProtectionController, CitizenBenefitsController, OfficialBenefitsController],
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
    SocialProtectionExperienceBoundaryService,
    BenefitScopeService,
    CitizenBenefitsProjectionService,
    OfficialBenefitsProjectionService,
    BenefitProgramDiscoveryService,
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
    SocialProtectionExperienceBoundaryService,
    BenefitScopeService,
    CitizenBenefitsProjectionService,
    OfficialBenefitsProjectionService,
    BenefitProgramDiscoveryService,
  ],
})
export class SocialProtectionModule {}
