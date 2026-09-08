import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { GovernmentStructureService } from './government-structure.service';

@Module({
  imports: [DatabaseModule],
  providers: [GovernmentStructureService],
  exports: [GovernmentStructureService],
})
export class GovernmentStructureModule {}
