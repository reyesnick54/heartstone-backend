import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { GovernmentStructureValidationService } from './government-structure-validation.service';

@Module({
  imports: [DatabaseModule],
  providers: [GovernmentStructureValidationService],
  exports: [GovernmentStructureValidationService],
})
export class GovernmentCommonModule {}
