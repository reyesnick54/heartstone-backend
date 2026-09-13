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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationDraftDto } from './dto/update-application-draft.dto';

@ApiTags('application-processing-applications')
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
    return this.applicationsService.findById(id, session.identityId);
  }

  @Patch(':id/draft')
  updateDraft(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDraftDto,
  ) {
    return this.applicationsService.updateDraft(id, session.identityId, dto);
  }

  @Post(':id/submit')
  submit(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submit(id, session.identityId, dto);
  }

  @Post(':id/corrections')
  submitCorrection(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submitCorrection(id, session.identityId, dto);
  }
}
