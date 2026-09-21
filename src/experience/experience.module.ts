import { Module } from '@nestjs/common';

import { BusinessExperienceModule } from './business/business-experience.module';
import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { ExperienceCommonModule } from './common/experience-common.module';
import { DepartmentModule } from './department/department.module';
import { OfficialModule } from './official/official.module';

@Module({
  imports: [
    ExperienceCommonModule,
    CitizenExperienceModule,
    BusinessExperienceModule,
    OfficialModule,
    DepartmentModule,
  ],
  exports: [
    ExperienceCommonModule,
    CitizenExperienceModule,
    BusinessExperienceModule,
    OfficialModule,
    DepartmentModule,
  ],
})
export class ExperienceModule {}
