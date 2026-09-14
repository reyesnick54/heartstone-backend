import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CommandConsoleController } from './command-console/command-console.controller';
import { DashboardAccessPolicyService } from './command-console/dashboard-access-policy.service';
import { DashboardBoundaryService } from './command-console/dashboard-boundary.service';
import { DashboardDefinitionService } from './command-console/dashboard-definition.service';
import { DashboardIndicatorProjectionService } from './command-console/dashboard-indicator-projection.service';
import { DashboardQueryService } from './command-console/dashboard-query.service';
import { DashboardSnapshotService } from './command-console/dashboard-snapshot.service';
import { DashboardStatusDictionaryService } from './command-console/dashboard-status-dictionary.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [CommandConsoleController],
  providers: [
    DashboardBoundaryService,
    DashboardStatusDictionaryService,
    DashboardDefinitionService,
    DashboardAccessPolicyService,
    DashboardIndicatorProjectionService,
    DashboardSnapshotService,
    DashboardQueryService,
  ],
  exports: [
    DashboardBoundaryService,
    DashboardStatusDictionaryService,
    DashboardDefinitionService,
    DashboardAccessPolicyService,
    DashboardIndicatorProjectionService,
    DashboardSnapshotService,
    DashboardQueryService,
  ],
})
export class IntelligenceModule {}
