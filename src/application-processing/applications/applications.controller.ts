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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationDraftDto } from './dto/update-application-draft.dto';

@ApiTags('application-processing-applications')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: "Applicant-owned case/application scope or official institutional case scope",
  authorityRequirement: "Case access guard; official routes require institutional actor context",
  actorSource: "Session identity with applicant or official case access resolution",
  primarySecurityInvariant: "Access to a case does not confer decision authority",
})
@Controller('applications')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@CurrentSession() session: SessionContextDto, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.createDraft(session.identityId, dto);
  }

  @Get(':id')
  findOne(@CurrentSession() session: SessionContextDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.findById(session, id);
  }

  @Patch(':id/draft')
  updateDraft(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDraftDto,
  ) {
    return this.applicationsService.updateDraft(session, id, dto);
  }

  @Post(':id/submit')
  submit(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submit(session, id, dto);
  }

  @Post(':id/corrections')
  submitCorrection(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submitCorrection(session, id, dto);
  }
}
