import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { AuthorityValidationService } from './common/authority-validation.service';
import { AuthorityConditionEvaluator } from './conditions/authority-condition-evaluator.service';
import { ConsequentialActionGuard } from './consequential-action/consequential-action.guard';
import { ConsequentialActionService } from './consequential-action/consequential-action.service';
import { AuthorityDependenciesController } from './dependencies/authority-dependencies.controller';
import { AuthorityDependenciesService } from './dependencies/authority-dependencies.service';
import { AuthorityDependencyEvaluator } from './dependencies/authority-dependency-evaluator.service';
import { AuthorityEvaluationController } from './evaluation/authority-evaluation.controller';
import { AuthorityEvaluationService } from './evaluation/authority-evaluation.service';
import { AuthorityFactsResolver } from './evaluation/authority-facts-resolver.service';
import { AuthorityExplanationService } from './explanation/authority-explanation.service';
import { FunctionActivationService } from './function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsController } from './function-authority-records/function-authority-records.controller';
import { FunctionAuthorityRecordsService } from './function-authority-records/function-authority-records.service';
import { GoverningSourcesController } from './governing-sources/governing-sources.controller';
import { GoverningSourcesService } from './governing-sources/governing-sources.service';
import { InstitutionalActorResolver } from './institutional-actor/institutional-actor-resolver.service';
import { AuthorityPolicyGuard } from './policy/authority-policy.guard';
import { AuthorityPolicyService } from './policy/authority-policy.service';
import { SegregationOfDutyEvaluator } from './sod/segregation-of-duty-evaluator.service';

@Module({
  imports: [SessionAuthGuardModule, DatabaseModule, ActorContextModule],
  controllers: [
    GoverningSourcesController,
    FunctionAuthorityRecordsController,
    AuthorityEvaluationController,
    AuthorityDependenciesController,
  ],
  providers: [
    GoverningSourcesService,
    FunctionAuthorityRecordsService,
    FunctionActivationService,
    AuthorityEvaluationService,
    AuthorityFactsResolver,
    AuthorityExplanationService,
    InstitutionalActorResolver,
    AuthorityConditionEvaluator,
    AuthorityDependencyEvaluator,
    AuthorityDependenciesService,
    AuthorityValidationService,
    SegregationOfDutyEvaluator,
    ConsequentialActionService,
    ConsequentialActionGuard,
    AuthorityPolicyGuard,
    AuthorityPolicyService,
  ],
  exports: [
    AuthorityEvaluationService,
    AuthorityDependencyEvaluator,
    AuthorityDependenciesService,
    FunctionAuthorityRecordsService,
    GoverningSourcesService,
    InstitutionalActorResolver,
    ConsequentialActionService,
    ConsequentialActionGuard,
    AuthorityPolicyGuard,
    AuthorityPolicyService,
  ],
})
export class AuthorityModule {}
