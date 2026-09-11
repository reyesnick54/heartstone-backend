import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { IdentityCommonModule } from '../common/identity-common.module';
import { ProtectedController } from './protected.controller';

@Module({
  imports: [AuthModule, IdentityCommonModule],
  controllers: [ProtectedController],
})
export class ProtectedModule {}
