import { Module } from '@nestjs/common';

import { SessionsModule } from '../identity/sessions/sessions.module';
import { EvidenceAiController, EvidenceController } from './evidence.controller';
import { EvidenceRecordsService } from './records/evidence-records.service';
import {
  EvidencePurposeAcceptanceService,
  EvidenceQualityAssessmentService,
  EvidenceRequirementLinkService,
} from './requirements/evidence-governance.service';
import { EvidenceVerificationService } from './verification/evidence-verification.service';

@Module({
  imports: [SessionsModule],
  controllers: [EvidenceController, EvidenceAiController],
  providers: [
    EvidenceRecordsService,
    EvidenceVerificationService,
    EvidenceRequirementLinkService,
    EvidencePurposeAcceptanceService,
    EvidenceQualityAssessmentService,
  ],
  exports: [
    EvidenceRecordsService,
    EvidenceVerificationService,
    EvidenceRequirementLinkService,
    EvidencePurposeAcceptanceService,
    EvidenceQualityAssessmentService,
  ],
})
export class EvidenceModule {}
