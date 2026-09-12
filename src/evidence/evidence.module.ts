import { Module } from '@nestjs/common';

import { EvidencePacketsModule } from './packets/evidence-packets.module';

@Module({
  imports: [EvidencePacketsModule],
  exports: [EvidencePacketsModule],
})
export class EvidenceModule {}
