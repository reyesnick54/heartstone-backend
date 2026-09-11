import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AuthorityConditionEvaluationService } from './evaluation/authority-condition-evaluation.service';
import { AuthorityConditionEvaluatorService } from './evaluation/authority-condition-evaluator.service';
import { SegregationOfDutiesService } from './segregation/segregation-of-duties.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    SegregationOfDutiesService,
    AuthorityConditionEvaluationService,
    AuthorityConditionEvaluatorService,
  ],
  exports: [
    SegregationOfDutiesService,
    AuthorityConditionEvaluationService,
    AuthorityConditionEvaluatorService,
  ],
})
export class AuthorityModule {}
