import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { SessionsService } from './sessions.service';

@Module({
  imports: [IdentityCommonModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
