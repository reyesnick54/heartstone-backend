import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AiModelGovernanceService } from './ai/ai-model-governance.service';
import { ChangeManagementService } from './changes/change-management.service';
import { EmergencyChangeService } from './changes/emergency-change.service';
import { CiGovernanceService } from './ci/ci-governance.service';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { ConfigurationGovernanceService } from './configuration/configuration-governance.service';
import { EnvironmentRegistryService } from './environments/environment-registry.service';
import { EnvironmentSeparationService } from './environments/environment-separation.service';
import { FeatureActivationService } from './features/feature-activation.service';
import { ProductionReadinessController } from './production-readiness.controller';
import { DeploymentService } from './releases/deployment.service';
import { ReleaseGovernanceService } from './releases/release-governance.service';
import { ReleaseRevalidationService } from './releases/release-revalidation.service';
import { RollbackService } from './releases/rollback.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [ProductionReadinessController],
  providers: [
    ProductionReadinessBoundaryService,
    AiModelGovernanceService,
    EnvironmentRegistryService,
    EnvironmentSeparationService,
    ReleaseGovernanceService,
    ReleaseRevalidationService,
    DeploymentService,
    RollbackService,
    ChangeManagementService,
    EmergencyChangeService,
    ConfigurationGovernanceService,
    FeatureActivationService,
    CiGovernanceService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    EnvironmentRegistryService,
    EnvironmentSeparationService,
    ReleaseGovernanceService,
    DeploymentService,
    ChangeManagementService,
    FeatureActivationService,
    CiGovernanceService,
import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { LaunchGateService } from './launch/launch-gate.service';
import { LaunchReadinessSnapshotService } from './launch/launch-readiness-snapshot.service';
import { OperationalActivationService } from './launch/operational-activation.service';
import {
  CapabilityReplacementService,
  CapabilityRetirementService,
  DecommissioningService,
  ExitAcceptanceService,
} from './lifecycle/decommissioning.service';
import { ProductionReadinessController } from './production-readiness.controller';
import {
  ProductionDefectService,
  StabilizationService,
} from './stabilization/stabilization.service';
import {
  OperationalRevalidationService,
  OperationalSuspensionService,
} from './suspension/operational-suspension.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [ProductionReadinessController],
  providers: [
    ProductionReadinessBoundaryService,
    LaunchReadinessSnapshotService,
    LaunchGateService,
    OperationalActivationService,
    StabilizationService,
    ProductionDefectService,
    OperationalSuspensionService,
    OperationalRevalidationService,
    CapabilityRetirementService,
    CapabilityReplacementService,
    DecommissioningService,
    ExitAcceptanceService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    LaunchReadinessSnapshotService,
    LaunchGateService,
    OperationalActivationService,
    StabilizationService,
    ProductionDefectService,
    OperationalSuspensionService,
    OperationalRevalidationService,
    CapabilityRetirementService,
    CapabilityReplacementService,
    DecommissioningService,
    ExitAcceptanceService,
  ],
})
export class ProductionReadinessModule {}
