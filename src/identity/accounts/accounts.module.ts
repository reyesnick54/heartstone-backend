import { Module } from '@nestjs/common';

import { AccountLookupService } from './account-lookup.service';

@Module({
  providers: [AccountLookupService],
  exports: [AccountLookupService],
})
export class AccountsModule {}
