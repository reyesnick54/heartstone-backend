import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { UserAccountsController } from './user-accounts.controller';
import { UserAccountsService } from './user-accounts.service';

@Module({
  imports: [IdentityCommonModule],
  controllers: [UserAccountsController],
  providers: [UserAccountsService],
  exports: [UserAccountsService],
})
export class UserAccountsModule {}
