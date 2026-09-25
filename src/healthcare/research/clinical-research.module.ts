import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { DatabaseModule } from '../../database/database.module';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { ClinicalResearchController } from './clinical-research.controller';
import { ClinicalResearchAccessService } from './common/clinical-research-access.service';
import { ClinicalResearchBoundaryService } from './common/clinical-research-boundary.service';
import { ClinicalTrialConsentService } from './consent/clinical-trial-consent.service';
import { ClinicalTrialDiscoveryService } from './discovery/clinical-trial-discovery.service';
import { PublicClinicalTrialDiscoveryController } from './discovery/public-clinical-trial-discovery.controller';
import { ClinicalTrialEnrollmentService } from './enrollment/clinical-trial-enrollment.service';
import { ResearchEthicsApprovalService } from './ethics/research-ethics-approval.service';
import { ClinicalTrialInterestService } from './interest/clinical-trial-interest.service';
import { PreliminaryTrialMatchingService } from './matching/preliminary-trial-matching.service';
import { ClinicalTrialProtocolVersionService } from './protocol/clinical-trial-protocol-version.service';
import { ClinicalTrialWithdrawalService } from './withdrawal/clinical-trial-withdrawal.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [ClinicalResearchController, PublicClinicalTrialDiscoveryController],
  providers: [
    ClinicalResearchBoundaryService,
    ClinicalResearchAccessService,
    ClinicalTrialDiscoveryService,
    PreliminaryTrialMatchingService,
    ClinicalTrialProtocolVersionService,
    ResearchEthicsApprovalService,
    ClinicalTrialInterestService,
    ClinicalTrialConsentService,
    ClinicalTrialEnrollmentService,
    ClinicalTrialWithdrawalService,
  ],
  exports: [
    ClinicalResearchBoundaryService,
    ClinicalResearchAccessService,
    ClinicalTrialDiscoveryService,
    PreliminaryTrialMatchingService,
    ClinicalTrialProtocolVersionService,
    ResearchEthicsApprovalService,
    ClinicalTrialEnrollmentService,
    ClinicalTrialWithdrawalService,
  ],
})
export class ClinicalResearchModule {}
