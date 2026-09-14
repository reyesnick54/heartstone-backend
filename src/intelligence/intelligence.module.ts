import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AnalysisService } from './analysis/analysis.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceBoundaryService,
    AnalysisService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
  ],
  exports: [
    IntelligenceBoundaryService,
    AnalysisService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
  ],
})
export class IntelligenceModule {}
