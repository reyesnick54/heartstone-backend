import { Module } from '@nestjs/common';

import { CitizenExperienceModule } from './citizen/citizen-experience.module';

@Module({
  imports: [CitizenExperienceModule],
  exports: [CitizenExperienceModule],
})
export class ExperienceModule {}
