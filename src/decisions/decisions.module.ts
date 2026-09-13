import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DecisionAssistanceService } from './decision-assistance.service';
import { DecisionsController } from './decisions.controller';
import { GovernmentDecisionsService } from './government-decisions.service';

@Module({
  imports: [AuthorityModule],
  controllers: [DecisionsController],
  providers: [GovernmentDecisionsService, DecisionAssistanceService],
  exports: [GovernmentDecisionsService, DecisionAssistanceService],
})
export class DecisionsModule {}
