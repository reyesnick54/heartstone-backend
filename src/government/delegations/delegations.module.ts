import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { DelegationsController } from './delegations.controller';
import { DelegationsService } from './delegations.service';

@Module({
  imports: [GovernmentCommonModule],
  controllers: [DelegationsController],
  providers: [DelegationsService],
})
export class DelegationsModule {}
