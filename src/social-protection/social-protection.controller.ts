import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { BenefitApplicationProfileService } from './applications/benefit-application-profile.service';
import { BenefitAwardService } from './awards/benefit-award.service';
import { BenefitEligibilityAssessmentService } from './eligibility/benefit-eligibility-assessment.service';
import { HouseholdRecordService } from './households/household-record.service';
import { BenefitApplicantProfileService } from './profiles/benefit-applicant-profile.service';

@ApiTags('social-protection')
@Controller('api/v1/social-protection')
export class SocialProtectionController {
  constructor(
    private readonly benefitApplicantProfileService: BenefitApplicantProfileService,
    private readonly householdRecordService: HouseholdRecordService,
    private readonly benefitApplicationProfileService: BenefitApplicationProfileService,
    private readonly benefitEligibilityAssessmentService: BenefitEligibilityAssessmentService,
    private readonly benefitAwardService: BenefitAwardService,
  ) {}

  @Post('applicant-profiles')
  @ApiOkResponse({ description: 'Benefit applicant profile created' })
  createApplicantProfile(
    @Body() body: Parameters<BenefitApplicantProfileService['createBenefitApplicantProfile']>[0],
  ) {
    return this.benefitApplicantProfileService.createBenefitApplicantProfile(body);
  }

  @Post('household-records')
  createHouseholdRecord(
    @Body() body: Parameters<HouseholdRecordService['createHouseholdRecord']>[0],
  ) {
    return this.householdRecordService.createHouseholdRecord(body);
  }

  @Post('benefit-application-profiles')
  linkBenefitApplicationProfile(
    @Body()
    body: Parameters<BenefitApplicationProfileService['linkBenefitApplicationProfile']>[0],
  ) {
    return this.benefitApplicationProfileService.linkBenefitApplicationProfile(body);
  }

  @Post('eligibility-assessments/preliminary')
  recordPreliminaryAssessment(
    @Body()
    body: Parameters<BenefitEligibilityAssessmentService['recordPreliminaryAssessment']>[0],
  ) {
    return this.benefitEligibilityAssessmentService.recordPreliminaryAssessment(body);
  }

  @Post('benefit-awards')
  createBenefitAward(@Body() body: Parameters<BenefitAwardService['createAuthoritativeAward']>[0]) {
    return this.benefitAwardService.createAuthoritativeAward(body);
  }
}
