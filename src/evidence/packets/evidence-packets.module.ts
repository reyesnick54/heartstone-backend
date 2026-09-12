import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { EvidencePacketsController } from './evidence-packets.controller';
import { EvidencePacketsService } from './evidence-packets.service';

@Module({
  imports: [SessionsModule],
  controllers: [EvidencePacketsController],
  providers: [EvidencePacketsService, SessionAuthGuard],
  exports: [EvidencePacketsService],
})
export class EvidencePacketsModule {}
