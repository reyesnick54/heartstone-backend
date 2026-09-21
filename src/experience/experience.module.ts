import { Module } from '@nestjs/common';

import { CitizenExperienceModule } from './citizen/citizen-experience.module';
import { OfficialModule } from './official/official.module';

@Module({
  imports: [CitizenExperienceModule, OfficialModule],
  exports: [CitizenExperienceModule, OfficialModule],
})
export class ExperienceModule {}
