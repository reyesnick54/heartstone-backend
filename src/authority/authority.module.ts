import { Module } from '@nestjs/common';

import { FunctionGoverningSourcesModule } from './function-governing-sources/function-governing-sources.module';
import { FunctionAuthorityRecordsModule } from './functions/function-authority-records.module';
import { GoverningSourcesModule } from './governing-sources/governing-sources.module';

@Module({
  imports: [FunctionAuthorityRecordsModule, GoverningSourcesModule, FunctionGoverningSourcesModule],
})
export class AuthorityModule {}
