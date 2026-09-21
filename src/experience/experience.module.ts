import { Module } from '@nestjs/common';

import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { ExperienceCommonModule } from './common/experience-common.module';
import { DepartmentModule } from './department/department.module';
import { ExecutiveModule } from './executive/executive.module';
import { OfficialModule } from './official/official.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
<<<<<<< HEAD
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
=======
  imports: [CitizenExperienceModule, OfficialModule, PlatformAdminModule],
  exports: [CitizenExperienceModule, OfficialModule, PlatformAdminModule],
>>>>>>> c33eacd (Add Platform Administration Experience API)
})
export class ExperienceModule {}
