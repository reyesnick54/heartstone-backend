import { Module } from '@nestjs/common';

import { SessionsModule } from '../identity/sessions/sessions.module';
import { InMemoryDocumentStorageAdapter } from './adapters/in-memory-document-storage.adapter';
import { NoopMalwareScanningAdapter } from './adapters/noop-malware-scanning.adapter';
import { TestMalwareScanningAdapter } from './adapters/test-malware-scanning.adapter';
import { ArchivalTransfersService } from './archival/archival-transfers.service';
import { DocumentAuditService } from './audit/document-audit.service';
import { RecordsClassificationsService } from './classifications/records-classifications.service';
import { EvidenceRecordsBoundaryService } from './common/evidence-records-boundary.service';
import { MasterFileCompletenessService } from './completeness/master-file-completeness.service';
import { RecordDispositionService } from './disposition/record-disposition.service';
import { DocumentAccessService } from './documents/document-access.service';
import { DocumentAssociationsService } from './documents/document-associations.service';
import { DocumentRecordsService } from './documents/document-records.service';
import { DocumentVersionsService } from './documents/document-versions.service';
import { DocumentsController } from './documents/documents.controller';
import { EvidenceRecordsController } from './evidence-records.controller';
import { ExternalRecordsRepositoriesService } from './external-repositories/external-records-repositories.service';
import { LegalHoldsService } from './legal-hold/legal-holds.service';
import { DOCUMENT_STORAGE_PORT } from './ports/document-storage.port';
import { MALWARE_SCANNING_PORT } from './ports/malware-scanning.port';
import { PreservationCollectionsService } from './preservation/preservation-collections.service';
import { RetentionSchedulesService } from './retention/retention-schedules.service';

@Module({
  imports: [SessionsModule],
  controllers: [DocumentsController, EvidenceRecordsController],
  providers: [
    EvidenceRecordsBoundaryService,
    MasterFileCompletenessService,
    DocumentRecordsService,
    DocumentVersionsService,
    DocumentAssociationsService,
    DocumentAccessService,
    DocumentAuditService,
    RecordsClassificationsService,
    RetentionSchedulesService,
    LegalHoldsService,
    PreservationCollectionsService,
    ArchivalTransfersService,
    ExternalRecordsRepositoriesService,
    RecordDispositionService,
    InMemoryDocumentStorageAdapter,
    NoopMalwareScanningAdapter,
    TestMalwareScanningAdapter,
    {
      provide: DOCUMENT_STORAGE_PORT,
      useExisting: InMemoryDocumentStorageAdapter,
    },
    {
      provide: MALWARE_SCANNING_PORT,
      useFactory: (
        testScanner: TestMalwareScanningAdapter,
        noopScanner: NoopMalwareScanningAdapter,
      ) => (process.env.NODE_ENV === 'test' ? testScanner : noopScanner),
      inject: [TestMalwareScanningAdapter, NoopMalwareScanningAdapter],
    },
  ],
  exports: [
    EvidenceRecordsBoundaryService,
    MasterFileCompletenessService,
    DocumentRecordsService,
    DocumentVersionsService,
    DocumentAssociationsService,
    DocumentAccessService,
    DocumentAuditService,
    RecordsClassificationsService,
    RetentionSchedulesService,
    LegalHoldsService,
    PreservationCollectionsService,
    ArchivalTransfersService,
    ExternalRecordsRepositoriesService,
    RecordDispositionService,
    DOCUMENT_STORAGE_PORT,
    MALWARE_SCANNING_PORT,
  ],
})
export class EvidenceRecordsModule {}
