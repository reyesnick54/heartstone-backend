import { Module } from '@nestjs/common';

import { ArchivalTransfersService } from './archival/archival-transfers.service';
import { RecordsClassificationsService } from './classifications/records-classifications.service';
import { RecordDispositionService } from './disposition/record-disposition.service';
import { EvidenceRecordsController } from './evidence-records.controller';
import { ExternalRecordsRepositoriesService } from './external-repositories/external-records-repositories.service';
import { LegalHoldsService } from './legal-hold/legal-holds.service';
import { PreservationCollectionsService } from './preservation/preservation-collections.service';
import { RetentionSchedulesService } from './retention/retention-schedules.service';

@Module({
  controllers: [EvidenceRecordsController],
  providers: [
    RecordsClassificationsService,
    RetentionSchedulesService,
    LegalHoldsService,
    PreservationCollectionsService,
    ArchivalTransfersService,
    ExternalRecordsRepositoriesService,
    RecordDispositionService,
  ],
  exports: [
    RecordsClassificationsService,
    RetentionSchedulesService,
    LegalHoldsService,
    PreservationCollectionsService,
    ArchivalTransfersService,
    ExternalRecordsRepositoriesService,
    RecordDispositionService,
  ],
})
export class EvidenceRecordsModule {}
