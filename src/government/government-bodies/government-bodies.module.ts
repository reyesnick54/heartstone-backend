import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { GovernmentBodiesController } from './government-bodies.controller';
import { GovernmentBodiesService } from './government-bodies.service';

@Module({
  imports: [GovernmentCommonModule],
  controllers: [GovernmentBodiesController],
  providers: [GovernmentBodiesService],
})
export class GovernmentBodiesModule {}
