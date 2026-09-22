import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { DatabaseModule } from '../../database/database.module';
import { ActorContextModule } from '../../identity/auth/context/actor-context.module';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { ServicePackAcceptanceService } from './service-pack-acceptance.service';
import { ServicePackGovernanceController } from './service-pack-governance.controller';
import { ServicePackGovernanceAuditService } from './service-pack-governance-audit.service';
import { ServicePackGovernanceBoundaryService } from './service-pack-governance-boundary.service';
import { ServicePackReviewService } from './service-pack-review.service';
import { ServicePackReviewChainService } from './service-pack-review-chain.service';

@Module({
  imports: [DatabaseModule, SessionsModule, ActorContextModule, AuthorityModule],
  controllers: [ServicePackGovernanceController],
  providers: [
    ServicePackGovernanceBoundaryService,
    ServicePackGovernanceAuditService,
    ServicePackReviewChainService,
    ServicePackReviewService,
    ServicePackAcceptanceService,
  ],
  exports: [
    ServicePackGovernanceBoundaryService,
    ServicePackAcceptanceService,
    ServicePackReviewService,
    ServicePackGovernanceAuditService,
  ],
})
export class ServicePackGovernanceModule {}
