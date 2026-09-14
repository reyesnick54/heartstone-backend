import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { InspectionComplianceBoundaryService } from './common/inspection-compliance-boundary.service';
import { CorrectiveActionService } from './corrective-action/corrective-action.service';

@Module({
  imports: [DatabaseModule],
  providers: [InspectionComplianceBoundaryService, CorrectiveActionService],
  exports: [InspectionComplianceBoundaryService, CorrectiveActionService],
import { AuthorityModule } from '../authority/authority.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { InspectionComplianceBoundaryService } from './boundary/inspection-compliance-boundary.service';
import { InspectionCompletionService } from './completion/inspection-completion.service';
import { InspectionFindingService } from './finding/inspection-finding.service';
import { InspectionObservationService } from './observation/inspection-observation.service';
import { InspectionResponseService } from './response/inspection-response.service';
import { InspectionSessionService } from './session/inspection-session.service';

@Module({
  imports: [AuthorityModule, EvidenceModule],
  providers: [
    InspectionComplianceBoundaryService,
    InspectionSessionService,
    InspectionObservationService,
    InspectionFindingService,
    InspectionResponseService,
    InspectionCompletionService,
  ],
  exports: [
    InspectionComplianceBoundaryService,
    InspectionSessionService,
    InspectionObservationService,
    InspectionFindingService,
    InspectionResponseService,
    InspectionCompletionService,
  ],
})
export class InspectionComplianceModule {}
