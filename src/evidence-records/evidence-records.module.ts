import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { EvidenceRecordsAccessService } from './common/evidence-records-access.service';
import { EvidenceRecordsBoundaryService } from './common/evidence-records-boundary.service';
import { GovernmentCommunicationRecordsService } from './communications/government-communication-records.service';
import { MasterFileCompletenessService } from './completeness/master-file-completeness.service';
import { RecordCorrectionsService } from './corrections/record-corrections.service';
import { DocumentRecordsService } from './documents/document-records.service';
import { EvidenceRecordsService } from './evidence/evidence-records.service';
import { EvidenceRecordsController } from './evidence-records.controller';
import { InspectionRecordsService } from './inspections/inspection-records.service';
import { LegalHoldsService } from './legal-holds/legal-holds.service';
import { MasterFilesController } from './master-files/master-files.controller';
import { MasterFilesService } from './master-files/master-files.service';
import { EvidencePacketsService } from './packets/evidence-packets.service';
import { ProfessionalReviewRecordsService } from './professional/professional-review-records.service';
import { HistoricalReplayService } from './replay/historical-replay.service';
import { ReplayController } from './replay/replay.controller';
import { RecordDispositionService } from './retention/record-disposition.service';
import { RetentionController } from './retention/retention.controller';
import { RetentionScheduleService } from './retention/retention-schedule.service';
import { DocumentStorageService } from './storage/document-storage.service';
import { InMemoryDocumentStorageService } from './storage/in-memory-document-storage.service';

@Module({
  imports: [DatabaseModule, AuthorityModule, SessionsModule],
  controllers: [
    EvidenceRecordsController,
    MasterFilesController,
    RetentionController,
    ReplayController,
  ],
  providers: [
    SessionAuthGuard,
    EvidenceRecordsAccessService,
    EvidenceRecordsBoundaryService,
    MasterFileCompletenessService,
    MasterFilesService,
    DocumentRecordsService,
    EvidenceRecordsService,
    EvidencePacketsService,
    RecordCorrectionsService,
    LegalHoldsService,
    RetentionScheduleService,
    RecordDispositionService,
    HistoricalReplayService,
    InspectionRecordsService,
    ProfessionalReviewRecordsService,
    GovernmentCommunicationRecordsService,
    {
      provide: DocumentStorageService,
      useClass: InMemoryDocumentStorageService,
    },
  ],
  exports: [
    MasterFileCompletenessService,
    MasterFilesService,
    DocumentRecordsService,
    EvidenceRecordsService,
    EvidencePacketsService,
    EvidenceRecordsBoundaryService,
    RetentionScheduleService,
    RecordDispositionService,
    HistoricalReplayService,
    DocumentStorageService,
  ],
})
export class EvidenceRecordsModule {}
