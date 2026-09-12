import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { GovernmentCommunicationService } from './communications/government-communication.service';
import { EvidenceCustodyService } from './custody/evidence-custody.service';
import { InspectionService } from './inspection/inspection.service';
import { ProfessionalReviewService } from './professional/professional-review.service';
import { EvidenceRecordsService } from './records/evidence-records.service';
import { DepartmentalReviewService } from './reviews/departmental-review.service';

@Module({
  imports: [DatabaseModule, AuthorityModule],
  providers: [
    EvidenceRecordsService,
    DepartmentalReviewService,
    GovernmentCommunicationService,
    ProfessionalReviewService,
    InspectionService,
    EvidenceCustodyService,
  ],
  exports: [
    EvidenceRecordsService,
    DepartmentalReviewService,
    GovernmentCommunicationService,
    ProfessionalReviewService,
    InspectionService,
    EvidenceCustodyService,
  ],
})
export class EvidenceModule {}
