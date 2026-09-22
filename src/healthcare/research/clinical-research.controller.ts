import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ClinicalResearchActorPersona } from '@prisma/client';

import { ClinicalTrialConsentService } from './consent/clinical-trial-consent.service';
import { ClinicalTrialEnrollmentService } from './enrollment/clinical-trial-enrollment.service';
import { ResearchEthicsApprovalService } from './ethics/research-ethics-approval.service';
import { ClinicalTrialInterestService } from './interest/clinical-trial-interest.service';
import { PreliminaryTrialMatchingService } from './matching/preliminary-trial-matching.service';
import { ClinicalTrialProtocolVersionService } from './protocol/clinical-trial-protocol-version.service';
import { ClinicalTrialWithdrawalService } from './withdrawal/clinical-trial-withdrawal.service';

@ApiTags('clinical-research')
@Controller('api/v1/clinical-research')
export class ClinicalResearchController {
  constructor(
    private readonly matchingService: PreliminaryTrialMatchingService,
    private readonly interestService: ClinicalTrialInterestService,
    private readonly consentService: ClinicalTrialConsentService,
    private readonly enrollmentService: ClinicalTrialEnrollmentService,
    private readonly ethicsService: ResearchEthicsApprovalService,
    private readonly protocolService: ClinicalTrialProtocolVersionService,
    private readonly withdrawalService: ClinicalTrialWithdrawalService,
  ) {}

  @Post('matching/preliminary')
  @ApiOkResponse({ description: 'Preliminary non-clinical trial match' })
  preliminaryMatch(@Body() body: Parameters<PreliminaryTrialMatchingService['match']>[0]) {
    return this.matchingService.match(body);
  }

  @Post('interests')
  expressInterest(@Body() body: Parameters<ClinicalTrialInterestService['expressInterest']>[0]) {
    return this.interestService.expressInterest(body);
  }

  @Post('consent-signatures')
  recordConsent(
    @Body() body: Parameters<ClinicalTrialConsentService['recordConsentSignature']>[0],
  ) {
    return this.consentService.recordConsentSignature(body);
  }

  @Post('enrollments')
  enroll(@Body() body: Parameters<ClinicalTrialEnrollmentService['enrollParticipant']>[0]) {
    return this.enrollmentService.enrollParticipant(body);
  }

  @Post('ethics-approvals/versions')
  recordEthicsVersion(
    @Body()
    body: Parameters<ResearchEthicsApprovalService['recordEthicsApprovalVersion']>[0],
  ) {
    return this.ethicsService.recordEthicsApprovalVersion(body);
  }

  @Post('protocol-versions/activate')
  activateProtocol(@Body() body: { protocolVersionId: string }) {
    return this.protocolService.activateProtocolVersion(body.protocolVersionId);
  }

  @Post('protocol-versions/amendments')
  amendProtocol(
    @Body() body: Parameters<ClinicalTrialProtocolVersionService['createAmendmentVersion']>[0],
  ) {
    return this.protocolService.createAmendmentVersion(body);
  }

  @Post('withdrawals')
  withdraw(
    @Body()
    body: {
      enrollmentId: string;
      reasonCategory: Parameters<
        ClinicalTrialWithdrawalService['withdrawParticipant']
      >[0]['reasonCategory'];
      reasonSummary: string;
      recordedByPersona?: ClinicalResearchActorPersona;
      recordedByIdentityId?: string;
    },
  ) {
    return this.withdrawalService.withdrawParticipant({
      enrollmentId: body.enrollmentId,
      reasonCategory: body.reasonCategory,
      reasonSummary: body.reasonSummary,
      recordedByPersona: body.recordedByPersona ?? ClinicalResearchActorPersona.PARTICIPANT,
      recordedByIdentityId: body.recordedByIdentityId,
    });
  }
}
