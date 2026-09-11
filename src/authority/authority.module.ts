import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AuthorityAuditService } from './audit/authority-audit.service';
import { AuthorityCacheService } from './cache/authority-cache.service';
import { AuthorityEvaluationService } from './evaluation/authority-evaluation.service';
import { AuthorityEvaluationRecordRepository } from './evaluation/authority-evaluation-record.repository';
import { AuthorityExplanationService } from './explanation/authority-explanation.service';
import { AuthorityRegistryService } from './registry/authority-registry.service';
import { AuthorityReplayService } from './replay/authority-replay.service';
import { AuthorityRevalidationService } from './revalidation/authority-revalidation.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [
    AuthorityAuditService,
    AuthorityEvaluationRecordRepository,
    AuthorityEvaluationService,
    AuthorityExplanationService,
    AuthorityReplayService,
    AuthorityRevalidationService,
    AuthorityCacheService,
    AuthorityRegistryService,
  ],
  exports: [
    AuthorityAuditService,
    AuthorityEvaluationRecordRepository,
    AuthorityEvaluationService,
    AuthorityExplanationService,
    AuthorityReplayService,
    AuthorityRevalidationService,
    AuthorityCacheService,
    AuthorityRegistryService,
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AuthorityValidationService } from './common/authority-validation.service';
import { AuthorityConditionEvaluator } from './conditions/authority-condition-evaluator.service';
import { AuthorityDependenciesController } from './dependencies/authority-dependencies.controller';
import { AuthorityDependenciesService } from './dependencies/authority-dependencies.service';
import { AuthorityDependencyEvaluator } from './dependencies/authority-dependency-evaluator.service';
import { AuthorityEvaluationController } from './evaluation/authority-evaluation.controller';
import { AuthorityEvaluationService } from './evaluation/authority-evaluation.service';
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
  imports: [SessionsModule],
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
    AuthorityExplanationService,
    InstitutionalActorResolver,
    AuthorityConditionEvaluator,
    AuthorityDependencyEvaluator,
    AuthorityDependenciesService,
    AuthorityValidationService,
    SegregationOfDutyEvaluator,
    AuthorityPolicyGuard,
    AuthorityPolicyService,
    SessionAuthGuard,
  ],
  exports: [
    AuthorityEvaluationService,
    FunctionAuthorityRecordsService,
    GoverningSourcesService,
    InstitutionalActorResolver,
    AuthorityPolicyGuard,
    AuthorityPolicyService,
  ],
})
export class AuthorityModule {}
