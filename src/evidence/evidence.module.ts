import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { IdentityModule } from '../identity/identity.module';
import { RecordAccessService } from './access/record-access.service';
import { RecordCorrectionService } from './correction/record-correction.service';
import { RecordIntegrityService } from './integrity/record-integrity.service';
import { RecordsReplayService } from './replay/records-replay.service';

@Module({
  imports: [AuthorityModule, IdentityModule],
  providers: [
    RecordIntegrityService,
    RecordAccessService,
    RecordCorrectionService,
    RecordsReplayService,
  ],
  exports: [
    RecordIntegrityService,
    RecordAccessService,
    RecordCorrectionService,
    RecordsReplayService,
  ],
})
export class EvidenceModule {}
