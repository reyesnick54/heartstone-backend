import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { StrategicProjectBoundaryService } from './common/strategic-project-boundary.service';
import { PerformanceClaimService } from './performance-claims/performance-claim.service';
import { CapitalEvidenceService } from './strategic-projects/capital-evidence.service';
import { EmploymentEvidenceService } from './strategic-projects/employment-evidence.service';
import { InfrastructureDeliveryService } from './strategic-projects/infrastructure-delivery.service';
import { ProjectStatusProjectionService } from './strategic-projects/project-status-projection.service';
import { SectorDevelopmentObservationService } from './strategic-projects/sector-development-observation.service';
import { StrategicProjectController } from './strategic-projects/strategic-project.controller';
import { StrategicProjectDependencyService } from './strategic-projects/strategic-project-dependency.service';
import { StrategicProjectEconomicClaimService } from './strategic-projects/strategic-project-economic-claim.service';
import { StrategicProjectMilestoneService } from './strategic-projects/strategic-project-milestone.service';
import { StrategicProjectProfileService } from './strategic-projects/strategic-project-profile.service';
import { StrategicProjectRiskService } from './strategic-projects/strategic-project-risk.service';
import { StrategicProjectStageService } from './strategic-projects/strategic-project-stage.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [StrategicProjectController],
  providers: [
    StrategicProjectBoundaryService,
    PerformanceClaimService,
    StrategicProjectProfileService,
    StrategicProjectStageService,
    StrategicProjectMilestoneService,
    StrategicProjectDependencyService,
    StrategicProjectRiskService,
    StrategicProjectEconomicClaimService,
    CapitalEvidenceService,
    EmploymentEvidenceService,
    InfrastructureDeliveryService,
    SectorDevelopmentObservationService,
    ProjectStatusProjectionService,
  ],
  exports: [
    StrategicProjectBoundaryService,
    PerformanceClaimService,
    StrategicProjectProfileService,
    StrategicProjectStageService,
    StrategicProjectMilestoneService,
    StrategicProjectDependencyService,
    StrategicProjectRiskService,
    StrategicProjectEconomicClaimService,
    CapitalEvidenceService,
    EmploymentEvidenceService,
    InfrastructureDeliveryService,
    SectorDevelopmentObservationService,
    ProjectStatusProjectionService,
  ],
})
export class IntelligenceModule {}
