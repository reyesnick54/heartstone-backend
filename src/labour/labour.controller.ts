import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType, LabourActorPersona, WorkPermitLifecycleStatus } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { EmploymentComplaintService } from './complaints/employment-complaint.service';
import {
  EmployerRegistryService,
  type RegisterEmployerInput,
} from './employers/employer-registry.service';
import { LABOUR_AUTHORITY_FUNCTION_CODES } from './labour.constants';
import { WorkPermitApplicationProfileService } from './work-permits/work-permit-application-profile.service';
import { WorkPermitRecordService } from './work-permits/work-permit-record.service';
import { WorkerProfileReferenceService } from './workers/worker-profile-reference.service';

@ApiTags('labour')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('labour')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
export class LabourController {
  constructor(
    private readonly employerRegistryService: EmployerRegistryService,
    private readonly workerProfileService: WorkerProfileReferenceService,
    private readonly workPermitApplicationProfileService: WorkPermitApplicationProfileService,
    private readonly employmentComplaintService: EmploymentComplaintService,
    private readonly workPermitRecords: WorkPermitRecordService,
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
    @Param('id', ParseUUIDPipe) id: string,
    @Query('requesterIdentityId', ParseUUIDPipe) requesterIdentityId: string,
  ) {
    return this.workerProfileService.getWorkerProfileForSubject(id, requesterIdentityId);
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

  @Post('work-permits/:id/approve')
  @ConsequentialAction({
    action: AuthorityActionType.APPROVE,
    functionCode: LABOUR_AUTHORITY_FUNCTION_CODES.WORK_PERMIT_APPROVE,
  })
  @ApiOkResponse({ description: 'Approve work permit after authority evaluation' })
  approveWorkPermit(
    @Param('id', ParseUUIDPipe) workPermitRecordId: string,
    @Body()
    body: {
      governmentDecisionId?: string;
      actorPersona?: LabourActorPersona;
    },
  ) {
    return this.workPermitRecords.recordStatusTransition({
      workPermitRecordId,
      toStatus: WorkPermitLifecycleStatus.EFFECTIVE,
      actorPersona: body.actorPersona ?? LabourActorPersona.LABOUR_OFFICER,
      governmentDecisionId: body.governmentDecisionId,
    });
  }
}
