import { Module } from '@nestjs/common';

import { AuthModule } from '../../identity/auth/auth.module';
import { AuthorityCommonModule } from '../common/authority-common.module';
import { FunctionAuthorityRecordsController } from './function-authority-records.controller';
import { FunctionAuthorityRecordsService } from './function-authority-records.service';

@Module({
  imports: [AuthorityCommonModule, AuthModule],
  controllers: [FunctionAuthorityRecordsController],
  providers: [FunctionAuthorityRecordsService],
  exports: [FunctionAuthorityRecordsService],
})
export class FunctionAuthorityRecordsModule {}
