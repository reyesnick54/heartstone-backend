import { Module } from '@nestjs/common';

import { BusinessExperienceModule } from './business/business-experience.module';
import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { ExperienceCommonModule } from './common/experience-common.module';
import { DepartmentModule } from './department/department.module';
import { ExecutiveModule } from './executive/executive.module';
import { OfficialModule } from './official/official.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
  imports: [
    ExperienceCommonModule,
    CitizenExperienceModule,
    BusinessExperienceModule,
    OfficialModule,
    DepartmentModule,
    ExecutiveModule,
    PlatformAdminModule,
  ],
  exports: [
    ExperienceCommonModule,
    CitizenExperienceModule,
    BusinessExperienceModule,
    OfficialModule,
    DepartmentModule,
    ExecutiveModule,
    PlatformAdminModule,
  ],
})
export class ExperienceModule {}
