import { Module } from '@nestjs/common';

import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { DepartmentModule } from './department/department.module';
import { OfficialModule } from './official/official.module';

@Module({
  imports: [CitizenExperienceModule, OfficialModule, DepartmentModule],
  exports: [CitizenExperienceModule, OfficialModule, DepartmentModule],
})
export class ExperienceModule {}
