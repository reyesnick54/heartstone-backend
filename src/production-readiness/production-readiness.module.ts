import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
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
  ],
})
export class ProductionReadinessModule {}
