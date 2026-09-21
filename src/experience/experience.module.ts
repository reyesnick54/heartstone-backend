import { Module } from '@nestjs/common';

import { BusinessExperienceModule } from './business/business-experience.module';
import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { OfficialModule } from './official/official.module';

@Module({
  imports: [CitizenExperienceModule, BusinessExperienceModule, OfficialModule],
  exports: [CitizenExperienceModule, BusinessExperienceModule, OfficialModule],
})
export class ExperienceModule {}
