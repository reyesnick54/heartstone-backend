import { Module } from '@nestjs/common';

import { AuthModule } from '../../identity/auth/auth.module';
import { AuthorityCommonModule } from '../common/authority-common.module';
import { FunctionAuthorityRecordsModule } from '../functions/function-authority-records.module';
import { GoverningSourcesModule } from '../governing-sources/governing-sources.module';
import { FunctionGoverningSourcesController } from './function-governing-sources.controller';
import { FunctionGoverningSourcesService } from './function-governing-sources.service';

@Module({
  imports: [
    AuthorityCommonModule,
    AuthModule,
    FunctionAuthorityRecordsModule,
    GoverningSourcesModule,
  ],
  controllers: [FunctionGoverningSourcesController],
  providers: [FunctionGoverningSourcesService],
  exports: [FunctionGoverningSourcesService],
})
export class FunctionGoverningSourcesModule {}
