import { Module } from '@nestjs/common';

import { SessionsModule } from '../identity/sessions/sessions.module';
import { InMemoryDocumentStorageAdapter } from './adapters/in-memory-document-storage.adapter';
import { NoopMalwareScanningAdapter } from './adapters/noop-malware-scanning.adapter';
import { TestMalwareScanningAdapter } from './adapters/test-malware-scanning.adapter';
import { DocumentAuditService } from './audit/document-audit.service';
import { DocumentAccessService } from './documents/document-access.service';
import { DocumentAssociationsService } from './documents/document-associations.service';
import { DocumentRecordsService } from './documents/document-records.service';
import { DocumentVersionsService } from './documents/document-versions.service';
import { DocumentsController } from './documents/documents.controller';
import { DOCUMENT_STORAGE_PORT } from './ports/document-storage.port';
import { MALWARE_SCANNING_PORT } from './ports/malware-scanning.port';

@Module({
  imports: [SessionsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentRecordsService,
    DocumentVersionsService,
    DocumentAssociationsService,
    DocumentAccessService,
    DocumentAuditService,
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
    DocumentRecordsService,
    DocumentVersionsService,
    DocumentAssociationsService,
    DocumentAccessService,
    DocumentAuditService,
    DOCUMENT_STORAGE_PORT,
    MALWARE_SCANNING_PORT,
  ],
})
export class EvidenceRecordsModule {}
