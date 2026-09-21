import { Module } from '@nestjs/common';

import { ActorContextService } from './actor-context.service';

@Module({
  providers: [ActorContextService],
  exports: [ActorContextService],
})
export class ActorContextModule {}
