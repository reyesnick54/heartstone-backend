import { Module } from '@nestjs/common';

import { SessionAuthGuardModule } from '../auth/session-auth-guard.module';
import { IdentityCommonModule } from '../common/identity-common.module';
import { ProtectedController } from './protected.controller';

@Module({
  imports: [SessionAuthGuardModule, IdentityCommonModule],
  controllers: [ProtectedController],
})
export class ProtectedModule {}
