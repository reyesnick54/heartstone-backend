import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../institutional-scope/dto/subject-access-query.dto';
import { EmploymentComplaintService } from './complaints/employment-complaint.service';
import {
  EmployerRegistryService,
  type RegisterEmployerInput,
} from './employers/employer-registry.service';
import { WorkPermitApplicationProfileService } from './work-permits/work-permit-application-profile.service';
import { WorkerProfileReferenceService } from './workers/worker-profile-reference.service';

@ApiTags('labour')
@Controller('api/v1/labour')
export class LabourController {
  constructor(
    private readonly employerRegistryService: EmployerRegistryService,
    private readonly workerProfileService: WorkerProfileReferenceService,
    private readonly workPermitApplicationProfileService: WorkPermitApplicationProfileService,
    private readonly employmentComplaintService: EmploymentComplaintService,
  ) {}

  @Post('employers/registry-records')
  @ApiOkResponse({ description: 'Employer registry record created' })
  registerEmployer(
    @Body()
    body: RegisterEmployerInput,
  ) {
    return this.employerRegistryService.registerEmployer(body);
  }

  @Post('workers/profile-references')
  createWorkerProfileReference(
    @Body() body: Parameters<WorkerProfileReferenceService['createWorkerProfileReference']>[0],
  ) {
    return this.workerProfileService.createWorkerProfileReference(body);
  }

  @Get('workers/profile-references/:id')
  getWorkerProfile(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SubjectAccessQueryDto,
  ) {
    return this.workerProfileService.getWorkerProfileForSubject(session, id, query);
  }

  @Post('work-permit-application-profiles')
  linkWorkPermitApplicationProfile(
    @Body()
    body: Parameters<WorkPermitApplicationProfileService['linkWorkPermitApplicationProfile']>[0],
  ) {
    return this.workPermitApplicationProfileService.linkWorkPermitApplicationProfile(body);
  }

  @Post('employment-complaints')
  fileEmploymentComplaint(
    @Body() body: Parameters<EmploymentComplaintService['fileComplaint']>[0],
  ) {
    return this.employmentComplaintService.fileComplaint(body);
  }
}
