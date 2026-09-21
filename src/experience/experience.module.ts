import { Module } from '@nestjs/common';

import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { ExperienceCommonModule } from './common/experience-common.module';
import { DepartmentModule } from './department/department.module';
import { ExecutiveModule } from './executive/executive.module';
import { OfficialModule } from './official/official.module';

@Module({
  imports: [
    ExperienceCommonModule,
    CitizenExperienceModule,
    OfficialModule,
    DepartmentModule,
    ExecutiveModule,
  ],
  exports: [
    ExperienceCommonModule,
    CitizenExperienceModule,
    OfficialModule,
    DepartmentModule,
    ExecutiveModule,
  ],
})
export class ExperienceModule {}
