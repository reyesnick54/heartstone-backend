import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { InspectionComplianceBoundaryService } from './common/inspection-compliance-boundary.service';
import { CorrectiveActionService } from './corrective-action/corrective-action.service';

@Module({
  imports: [DatabaseModule],
  providers: [InspectionComplianceBoundaryService, CorrectiveActionService],
  exports: [InspectionComplianceBoundaryService, CorrectiveActionService],
})
export class InspectionComplianceModule {}
