import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CasesService } from './cases.service';
import { AssignCaseManagerDto } from './dto/assign-case-manager.dto';
import { CaseResponseDto } from './dto/case-response.dto';
import { CaseStatusHistoryResponseDto } from './dto/case-status-history-response.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';

@ApiTags('cases')
@Controller('cases')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post('from-application/:applicationId')
  @ApiOperation({ summary: 'Create a case from a received application' })
  @ApiCreatedResponse({ type: CaseResponseDto })
  createFromApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentSession() session: SessionContextDto,
  ): Promise<CaseResponseDto> {
    return this.casesService.createFromApplication(applicationId, session.identityId);
  }

  @Get()
  @ApiOperation({ summary: 'List accessible cases' })
  @ApiOkResponse({ type: CaseResponseDto, isArray: true })
  findAll(
    @Query() query: QueryCasesDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<CaseResponseDto[]> {
    return this.casesService.findAll(query, session.identityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a case by id' })
  @ApiOkResponse({ type: CaseResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSession() session: SessionContextDto,
  ): Promise<CaseResponseDto> {
    return this.casesService.findOne(id, session.identityId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update case status' })
  @ApiOkResponse({ type: CaseResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseStatusDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<CaseResponseDto> {
    return this.casesService.updateStatus(id, dto, session.identityId);
  }

  @Patch(':id/manager')
  @ApiOperation({ summary: 'Assign or clear case manager and office' })
  @ApiOkResponse({ type: CaseResponseDto })
  assignManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCaseManagerDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<CaseResponseDto> {
    return this.casesService.assignManager(id, dto, session.identityId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'List case status history entries' })
  @ApiOkResponse({ type: CaseStatusHistoryResponseDto, isArray: true })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSession() session: SessionContextDto,
  ): Promise<CaseStatusHistoryResponseDto[]> {
    return this.casesService.getHistory(id, session.identityId);
  }
}
