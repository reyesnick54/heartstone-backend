import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { BenefitApplicationProfileService } from './applications/benefit-application-profile.service';
import { BenefitAwardService } from './awards/benefit-award.service';
import { BenefitEligibilityAssessmentService } from './eligibility/benefit-eligibility-assessment.service';
import { HouseholdRecordService } from './households/household-record.service';
import { BenefitApplicantProfileService } from './profiles/benefit-applicant-profile.service';
import { SOCIAL_PROTECTION_AUTHORITY_FUNCTION_CODES } from './social-protection.constants';

@ApiTags('social-protection')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('social-protection')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
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
  @ConsequentialAction({
    action: AuthorityActionType.APPROVE,
    functionCode: SOCIAL_PROTECTION_AUTHORITY_FUNCTION_CODES.BENEFIT_AWARD,
  })
  createBenefitAward(@Body() body: Parameters<BenefitAwardService['createAuthoritativeAward']>[0]) {
    return this.benefitAwardService.createAuthoritativeAward({
      ...body,
      humanDecisionRecorded: body.humanDecisionRecorded ?? true,
    });
  }
}
