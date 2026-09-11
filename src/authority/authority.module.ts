import { Module } from '@nestjs/common';

import { FunctionAuthorityRecordsModule } from './functions/function-authority-records.module';

@Module({
  imports: [FunctionAuthorityRecordsModule],
})
export class AuthorityModule {}
