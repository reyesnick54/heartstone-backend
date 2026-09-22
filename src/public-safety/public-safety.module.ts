import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { DepartmentModule } from '../experience/department/department.module';
import { ExecutiveModule } from '../experience/executive/executive.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { PublicSafetyAccessService } from './common/public-safety-access.service';
import { PublicSafetyBoundaryService } from './common/public-safety-boundary.service';
import { BusinessPublicSafetyController } from './experience/business-public-safety.controller';
import { CitizenPublicSafetyController } from './experience/citizen-public-safety.controller';
import { DepartmentPublicSafetyController } from './experience/department-public-safety.controller';
import { ExecutivePublicSafetyController } from './experience/executive-public-safety.controller';
import { OfficialPublicSafetyController } from './experience/official-public-safety.controller';
import { BusinessPublicSafetyProjectionService } from './experience/services/business-public-safety-projection.service';
import { CitizenPublicSafetyProjectionService } from './experience/services/citizen-public-safety-projection.service';
import { DepartmentPublicSafetyMetricsService } from './experience/services/department-public-safety-metrics.service';
import { ExecutivePublicSafetyProjectionService } from './experience/services/executive-public-safety-projection.service';
import { OfficialPublicSafetyProjectionService } from './experience/services/official-public-safety-projection.service';
import { PublicPublicSafetyNoticeController } from './notices/public-public-safety-notice.controller';
import { PublicSafetyNoticeService } from './notices/public-safety-notice.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, DepartmentModule, ExecutiveModule],
  controllers: [
    CitizenPublicSafetyController,
    BusinessPublicSafetyController,
    OfficialPublicSafetyController,
    DepartmentPublicSafetyController,
    ExecutivePublicSafetyController,
    PublicPublicSafetyNoticeController,
  ],
  providers: [
    PublicSafetyBoundaryService,
    PublicSafetyAccessService,
    PublicSafetyNoticeService,
    CitizenPublicSafetyProjectionService,
    BusinessPublicSafetyProjectionService,
    OfficialPublicSafetyProjectionService,
    DepartmentPublicSafetyMetricsService,
    ExecutivePublicSafetyProjectionService,
  ],
  exports: [
    PublicSafetyBoundaryService,
    PublicSafetyAccessService,
    PublicSafetyNoticeService,
    CitizenPublicSafetyProjectionService,
    BusinessPublicSafetyProjectionService,
    OfficialPublicSafetyProjectionService,
    DepartmentPublicSafetyMetricsService,
    ExecutivePublicSafetyProjectionService,
  ],
})
export class PublicSafetyModule {}
