import { Module } from '@nestjs/common';

import { OfficialModule } from './official/official.module';

@Module({
  imports: [OfficialModule],
  exports: [OfficialModule],
})
export class ExperienceModule {}
