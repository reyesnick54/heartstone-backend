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
  ],
})
export class AuthorityModule {}
