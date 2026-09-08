import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { GovernmentStructureModule } from '../structure/government-structure.module';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';

@Module({
  imports: [GovernmentCommonModule, GovernmentStructureModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
