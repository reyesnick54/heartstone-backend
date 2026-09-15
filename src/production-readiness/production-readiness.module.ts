import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { FeatureActivationService } from './feature-activation/feature-activation.service';
import { AcceptanceDecisionService } from './institutional-acceptance/acceptance-decision.service';
import { AcceptanceReviewService } from './institutional-acceptance/acceptance-review.service';
import { InstitutionalAcceptanceDossierService } from './institutional-acceptance/institutional-acceptance-dossier.service';
import { ProductionActivationService } from './institutional-acceptance/production-activation.service';
import { ResidualRiskService } from './institutional-acceptance/residual-risk.service';

@Module({
  imports: [DatabaseModule, AuthorityModule],
  providers: [
    ProductionReadinessBoundaryService,
    InstitutionalAcceptanceDossierService,
    AcceptanceReviewService,
    AcceptanceDecisionService,
    ResidualRiskService,
    ProductionActivationService,
    FeatureActivationService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    InstitutionalAcceptanceDossierService,
    AcceptanceReviewService,
    AcceptanceDecisionService,
    ResidualRiskService,
    ProductionActivationService,
    FeatureActivationService,
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { OperatorAccessAlignmentService } from './access/operator-access-alignment.service';
import { OperatorFunctionAccessService } from './access/operator-function-access.service';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { DepartmentReadinessService } from './readiness/department-readiness.service';
import { ReadinessController } from './readiness/readiness.controller';
import { SupportController } from './support/support.controller';
import { SupportCoverageService } from './support/support-coverage.service';
import { OperationalRoleRequirementService } from './workforce/operational-role-requirement.service';
import { OperatorCompetencyAssessmentService } from './workforce/operator-competency-assessment.service';
import { OperatorQualificationService } from './workforce/operator-qualification.service';
import { OperatorReadinessProfileService } from './workforce/operator-readiness-profile.service';
import { TrainingService } from './workforce/training.service';
import { WorkforceController } from './workforce/workforce.controller';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [WorkforceController, SupportController, ReadinessController],
  providers: [
    ProductionReadinessBoundaryService,
    OperationalRoleRequirementService,
    OperatorReadinessProfileService,
    OperatorQualificationService,
    OperatorCompetencyAssessmentService,
    TrainingService,
    SupportCoverageService,
    DepartmentReadinessService,
    OperatorAccessAlignmentService,
    OperatorFunctionAccessService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    OperationalRoleRequirementService,
    OperatorReadinessProfileService,
    OperatorQualificationService,
    OperatorCompetencyAssessmentService,
    TrainingService,
    SupportCoverageService,
    DepartmentReadinessService,
    OperatorAccessAlignmentService,
    OperatorFunctionAccessService,
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
