import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ComplaintService } from './complaint.service';
import { ComplaintAssignmentService } from './complaint-assignment.service';
import { ComplaintClosureService } from './complaint-closure.service';
import { ComplaintFindingService } from './complaint-finding.service';
import { ComplaintInvestigationService } from './complaint-investigation.service';
import { ComplaintPublicViewService } from './complaint-public-view.service';
import { ComplaintRemedyService } from './complaint-remedy.service';
import { LodgeComplaintDto } from './dto/lodge-complaint.dto';

@ApiTags('redress-complaints')
@Controller('redress/complaints')
export class ComplaintsController {
  constructor(
    private readonly complaints: ComplaintService,
    private readonly assignments: ComplaintAssignmentService,
    private readonly investigations: ComplaintInvestigationService,
    private readonly findings: ComplaintFindingService,
    private readonly remedies: ComplaintRemedyService,
    private readonly closures: ComplaintClosureService,
    private readonly publicView: ComplaintPublicViewService,
  ) {}

  @Post()
  lodge(@Body() body: LodgeComplaintDto) {
    return this.complaints.lodge(body);
  }

  @Get(':complaintId')
  findById(@Param('complaintId') complaintId: string) {
    return this.complaints.findById(complaintId);
  }

  @Post(':complaintId/acknowledge')
  acknowledge(@Param('complaintId') complaintId: string) {
    return this.complaints.acknowledge(complaintId);
  }

  @Get(':complaintId/public-view')
  publicApplicantView(@Param('complaintId') complaintId: string) {
    return this.publicView.getApplicantView(complaintId);
  }
}
