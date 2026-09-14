import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SubstantiveAppealService } from './appeals/substantive-appeal.service';
import { ComplaintService } from './complaints/complaint.service';
import { ComplaintAssignmentService } from './complaints/complaint-assignment.service';
import { ComplaintBoundaryService } from './complaints/complaint-boundary.service';
import { ComplaintClosureService } from './complaints/complaint-closure.service';
import { ComplaintFindingService } from './complaints/complaint-finding.service';
import { ComplaintInvestigationService } from './complaints/complaint-investigation.service';
import { ComplaintPublicViewService } from './complaints/complaint-public-view.service';
import { ComplaintRemedyService } from './complaints/complaint-remedy.service';
import { ComplaintsController } from './complaints/complaints.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ComplaintsController],
  providers: [
    ComplaintBoundaryService,
    ComplaintService,
    ComplaintAssignmentService,
    ComplaintInvestigationService,
    ComplaintFindingService,
    ComplaintRemedyService,
    ComplaintClosureService,
    ComplaintPublicViewService,
    SubstantiveAppealService,
  ],
  exports: [
    ComplaintBoundaryService,
    ComplaintService,
    ComplaintAssignmentService,
    ComplaintInvestigationService,
    ComplaintFindingService,
    ComplaintRemedyService,
    ComplaintClosureService,
    ComplaintPublicViewService,
    SubstantiveAppealService,
  ],
})
export class RedressModule {}
