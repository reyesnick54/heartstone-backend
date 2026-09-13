import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { IdentityModule } from '../identity/identity.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { RecordAccessService } from './access/record-access.service';
import { GovernmentCommunicationService } from './communications/government-communication.service';
import { RecordCorrectionService } from './correction/record-correction.service';
import { EvidenceCustodyService } from './custody/evidence-custody.service';
import { EvidenceAiController, EvidenceController } from './evidence.controller';
import { InspectionService } from './inspection/inspection.service';
import { RecordIntegrityService } from './integrity/record-integrity.service';
import { EvidencePacketsModule } from './packets/evidence-packets.module';
import { ProfessionalReviewService } from './professional/professional-review.service';
import { EvidenceRecordsService } from './records/evidence-records.service';
import { RecordsReplayService } from './replay/records-replay.service';
import {
  EvidencePurposeAcceptanceService,
  EvidenceQualityAssessmentService,
  EvidenceRequirementLinkService,
} from './requirements/evidence-governance.service';
import { DepartmentalReviewService } from './reviews/departmental-review.service';
import { EvidenceVerificationService } from './verification/evidence-verification.service';

@Module({
  imports: [SessionsModule, AuthorityModule, IdentityModule, IdentityCommonModule, EvidencePacketsModule],
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
    RecordIntegrityService,
    RecordAccessService,
    RecordCorrectionService,
    RecordsReplayService,
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
    RecordIntegrityService,
    RecordAccessService,
    RecordCorrectionService,
    RecordsReplayService,
    EvidencePacketsModule,
  ],
})
export class EvidenceModule {}
