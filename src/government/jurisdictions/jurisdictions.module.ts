import { Module } from '@nestjs/common';

import { GovernmentStructureModule } from '../structure/government-structure.module';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';

@Module({
  imports: [GovernmentStructureModule],
  controllers: [JurisdictionsController],
  providers: [JurisdictionsService],
  exports: [JurisdictionsService],
})
export class JurisdictionsModule {}
