import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { ApplicationsService } from './applications.service';
import { ApplicationRecordDto } from './dto/application-record.dto';
import {
  ApplicationDetailRecordDto,
  ApplicationSubmissionResultDto,
} from './dto/application-submission-record.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationDraftDto } from './dto/update-application-draft.dto';

@ApiTags('application-processing-applications')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: 'Applicant-owned case/application scope or official institutional case scope',
  authorityRequirement: 'Case access guard; official routes require institutional actor context',
  actorSource: 'Session identity with applicant or official case access resolution',
  primarySecurityInvariant: 'Access to a case does not confer decision authority',
})
@Controller('applications')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft application for the signed-in applicant' })
  @ApiCreatedResponse({ type: ApplicationRecordDto })
  create(@CurrentSession() session: SessionContextDto, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.createDraft(session.identityId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an application with its submissions and case (applicant or scoped official)',
  })
  @ApiOkResponse({ type: ApplicationDetailRecordDto })
  findOne(@CurrentSession() session: SessionContextDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.findById(session, id);
  }

  @Patch(':id/draft')
  @ApiOperation({ summary: 'Replace the draft answers of a DRAFT application' })
  @ApiOkResponse({ type: ApplicationRecordDto })
  updateDraft(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDraftDto,
  ) {
    return this.applicationsService.updateDraft(session, id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit a DRAFT application',
    description:
      'Validates answers against the pinned form version and opens a case. Submission records receipt only; it is not approval.',
  })
  @ApiCreatedResponse({ type: ApplicationSubmissionResultDto })
  submit(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submit(session, id, dto);
  }

  @Post(':id/corrections')
  @ApiOperation({
    summary: 'Submit corrected answers while the case is waiting for the applicant',
    description:
      'Supersedes the prior submission without erasing it and returns the case to completeness review.',
  })
  @ApiCreatedResponse({ type: ApplicationSubmissionResultDto })
  submitCorrection(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submitCorrection(session, id, dto);
  }
}
