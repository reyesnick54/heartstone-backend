import { Module } from '@nestjs/common';

import { ComplianceModule } from '../../compliance/compliance.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../identity/auth/auth.module';
import { IntelligenceModule } from '../../intelligence/intelligence.module';
import { ExecutiveController } from './executive.controller';
import { ExecutiveExperienceGuard } from './guards/executive-experience.guard';
import { ExecutiveBriefingService } from './services/executive-briefing.service';
import { ExecutiveContextService } from './services/executive-context.service';
import { ExecutiveIndicatorService } from './services/executive-indicator.service';

@Module({
  imports: [DatabaseModule, AuthModule, IntelligenceModule, ComplianceModule],
  controllers: [ExecutiveController],
  providers: [
    ExecutiveExperienceGuard,
    ExecutiveContextService,
    ExecutiveIndicatorService,
    ExecutiveBriefingService,
  ],
  exports: [ExecutiveContextService, ExecutiveIndicatorService, ExecutiveBriefingService],
})
export class ExecutiveModule {}
