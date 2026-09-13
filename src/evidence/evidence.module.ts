import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { GovernmentCommunicationService } from './communications/government-communication.service';
import { EvidenceCustodyService } from './custody/evidence-custody.service';
import { EvidenceAiController, EvidenceController } from './evidence.controller';
import { InspectionService } from './inspection/inspection.service';
import { ProfessionalReviewService } from './professional/professional-review.service';
import { EvidenceRecordsService } from './records/evidence-records.service';
import {
  EvidencePurposeAcceptanceService,
  EvidenceQualityAssessmentService,
  EvidenceRequirementLinkService,
} from './requirements/evidence-governance.service';
import { DepartmentalReviewService } from './reviews/departmental-review.service';
import { EvidenceVerificationService } from './verification/evidence-verification.service';

@Module({
  imports: [SessionsModule, AuthorityModule],
  controllers: [EvidenceController, EvidenceAiController],
  providers: [
    EvidenceRecordsService,
    EvidenceVerificationService,
    EvidenceRequirementLinkService,
    EvidencePurposeAcceptanceService,
    EvidenceQualityAssessmentService,
    DepartmentalReviewService,
    GovernmentCommunicationService,
    ProfessionalReviewService,
    InspectionService,
    EvidenceCustodyService,
  ],
  exports: [
    EvidenceRecordsService,
    EvidenceVerificationService,
    EvidenceRequirementLinkService,
    EvidencePurposeAcceptanceService,
    EvidenceQualityAssessmentService,
    DepartmentalReviewService,
    GovernmentCommunicationService,
    ProfessionalReviewService,
    InspectionService,
    EvidenceCustodyService,
  ],
})
export class EvidenceModule {}
