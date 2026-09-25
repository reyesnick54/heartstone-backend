import { Module } from '@nestjs/common';

import { SessionAuthGuardModule } from '../../identity/auth/session-auth-guard.module';
import { EvidencePacketsController } from './evidence-packets.controller';
import { EvidencePacketsService } from './evidence-packets.service';

@Module({
  imports: [SessionAuthGuardModule],
  controllers: [EvidencePacketsController],
  providers: [EvidencePacketsService],
  exports: [EvidencePacketsService],
})
export class EvidencePacketsModule {}
