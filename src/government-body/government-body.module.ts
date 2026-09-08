import { Module } from '@nestjs/common';

import { GovernmentBodyController } from './government-body.controller';
import { GovernmentBodyService } from './government-body.service';

@Module({
  controllers: [GovernmentBodyController],
  providers: [GovernmentBodyService],
  exports: [GovernmentBodyService],
})
export class GovernmentBodyModule {}
