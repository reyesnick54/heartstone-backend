import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';

@Module({
  imports: [IdentityCommonModule],
  controllers: [IdentitiesController],
  providers: [IdentitiesService],
  exports: [IdentitiesService],
})
export class IdentitiesModule {}
