import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ActivationGovernanceService } from './activation/activation-governance.service';
import { CapabilityDefinitionService } from './capabilities/capability-definition.service';
import { CapabilityMaturityService } from './capabilities/capability-maturity.service';
import { BusinessContinuityBoundaryService } from './common/business-continuity-boundary.service';
import { OperationalReadinessBoundaryService } from './common/operational-readiness-boundary.service';
import { BackupRecoveryService } from './continuity/backup-recovery.service';
import { ContinuityEventService } from './continuity/continuity-event.service';
import { CriticalServiceService } from './continuity/critical-service.service';
import { ManualOperationService } from './continuity/manual-operation.service';
import { RecoveryExerciseService } from './continuity/recovery-exercise.service';
import { ResumptionService } from './continuity/resumption.service';
import { CapabilityDependencyService } from './dependencies/capability-dependency.service';
import { OperationalReadinessController } from './operational-readiness.controller';
import { CapabilityOwnerService } from './owners/capability-owner.service';
import { ProductionReadinessService } from './readiness/production-readiness.service';
import { CapabilityRevalidationService } from './revalidation/capability-revalidation.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [OperationalReadinessController],
  providers: [
    OperationalReadinessBoundaryService,
    BusinessContinuityBoundaryService,
    CapabilityDefinitionService,
    CapabilityMaturityService,
    ProductionReadinessService,
    ActivationGovernanceService,
    CapabilityDependencyService,
    CapabilityOwnerService,
    CapabilityRevalidationService,
    CriticalServiceService,
    BackupRecoveryService,
    ContinuityEventService,
    ManualOperationService,
    ResumptionService,
    RecoveryExerciseService,
  ],
  exports: [
    OperationalReadinessBoundaryService,
    BusinessContinuityBoundaryService,
    CapabilityDefinitionService,
    CapabilityMaturityService,
    ProductionReadinessService,
    ActivationGovernanceService,
    CapabilityDependencyService,
    CapabilityOwnerService,
    CapabilityRevalidationService,
    CriticalServiceService,
    BackupRecoveryService,
    ContinuityEventService,
    ManualOperationService,
    ResumptionService,
    RecoveryExerciseService,
  ],
})
export class OperationalReadinessModule {}
