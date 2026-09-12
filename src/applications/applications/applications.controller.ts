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
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { ApplicationsService } from './applications.service';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { ApplicationSubmissionResponseDto } from './dto/application-submission-response.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmissionAcknowledgmentDto } from './dto/submission-acknowledgment.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationDraftDto } from './dto/update-application-draft.dto';

@ApiTags('applications')
@Controller('applications')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application draft' })
  @ApiCreatedResponse({ type: ApplicationResponseDto })
  create(
    @Body() dto: CreateApplicationDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.create(dto, session.identityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an application by id' })
  @ApiOkResponse({ type: ApplicationResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSession() session: SessionContextDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.findOne(id, session.identityId);
  }

  @Patch(':id/draft')
  @ApiOperation({ summary: 'Update application draft answers' })
  @ApiOkResponse({ type: ApplicationResponseDto })
  updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDraftDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.updateDraft(id, dto, session.identityId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit an application with immutable snapshot' })
  @ApiCreatedResponse({ type: SubmissionAcknowledgmentDto })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<SubmissionAcknowledgmentDto> {
    return this.applicationsService.submit(id, dto, session.identityId);
  }

  @Post(':id/resubmit')
  @ApiOperation({ summary: 'Resubmit corrected application answers' })
  @ApiCreatedResponse({ type: SubmissionAcknowledgmentDto })
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<SubmissionAcknowledgmentDto> {
    return this.applicationsService.resubmit(id, dto, session.identityId);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw an application' })
  @ApiOkResponse({ type: ApplicationResponseDto })
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSession() session: SessionContextDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.withdraw(id, session.identityId);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'List immutable submission snapshots for an application' })
  @ApiOkResponse({ type: ApplicationSubmissionResponseDto, isArray: true })
  listSubmissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSession() session: SessionContextDto,
  ): Promise<ApplicationSubmissionResponseDto[]> {
    return this.applicationsService.listSubmissions(id, session.identityId);
  }
}
