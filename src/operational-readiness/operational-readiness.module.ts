import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ActivationGovernanceService } from './activation/activation-governance.service';
import { CapabilityDefinitionService } from './capabilities/capability-definition.service';
import { CapabilityMaturityService } from './capabilities/capability-maturity.service';
import { OperationalReadinessBoundaryService } from './common/operational-readiness-boundary.service';
import { CapabilityDependencyService } from './dependencies/capability-dependency.service';
import { OperationalReadinessController } from './operational-readiness.controller';
import { CapabilityOwnerService } from './owners/capability-owner.service';
import { ProductionReadinessService } from './readiness/production-readiness.service';
import { CapabilityRevalidationService } from './revalidation/capability-revalidation.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [OperationalReadinessController],
  providers: [
    OperationalReadinessBoundaryService,
    CapabilityDefinitionService,
    CapabilityMaturityService,
    ProductionReadinessService,
    ActivationGovernanceService,
    CapabilityDependencyService,
    CapabilityOwnerService,
    CapabilityRevalidationService,
  ],
  exports: [
    OperationalReadinessBoundaryService,
    CapabilityDefinitionService,
    CapabilityMaturityService,
    ProductionReadinessService,
    ActivationGovernanceService,
    CapabilityDependencyService,
    CapabilityOwnerService,
    CapabilityRevalidationService,
  ],
})
export class OperationalReadinessModule {}
