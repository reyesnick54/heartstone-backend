import { Module } from '@nestjs/common';

import { AuthModule } from '../../identity/auth/auth.module';
import { AuthorityCommonModule } from '../common/authority-common.module';
import { GoverningSourcesController } from './governing-sources.controller';
import { GoverningSourcesService } from './governing-sources.service';

@Module({
  imports: [AuthorityCommonModule, AuthModule],
  controllers: [GoverningSourcesController],
  providers: [GoverningSourcesService],
  exports: [GoverningSourcesService],
})
export class GoverningSourcesModule {}
