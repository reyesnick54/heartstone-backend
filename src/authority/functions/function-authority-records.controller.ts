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

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import {
  SourceFoundationEvaluation,
  SourceFoundationEvaluatorService,
} from '../common/source-foundation-evaluator.service';
import { CreateFunctionAuthorityRecordDto } from './dto/create-function-authority-record.dto';
import {
  FunctionAuthorityRecordResponseDto,
  QueryFunctionAuthorityRecordsDto,
} from './dto/function-authority-record.dto';
import { UpdateFunctionAuthorityRecordDto } from './dto/update-function-authority-record.dto';
import { FunctionAuthorityRecordsService } from './function-authority-records.service';

@ApiTags('authority-functions')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('authority/functions')
export class FunctionAuthorityRecordsController {
  constructor(
    private readonly recordsService: FunctionAuthorityRecordsService,
    private readonly sourceFoundationEvaluator: SourceFoundationEvaluatorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a consequential function in the authority control register' })
  @ApiCreatedResponse({ type: FunctionAuthorityRecordResponseDto })
  create(
    @Body() dto: CreateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.recordsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List function authority records' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto, isArray: true })
  findAll(
    @Query() query: QueryFunctionAuthorityRecordsDto,
  ): Promise<FunctionAuthorityRecordResponseDto[]> {
    return this.recordsService.findAll(query);
  }

  @Get(':id/source-foundation')
  @ApiOperation({ summary: 'Evaluate governing source foundation for a function' })
  evaluateSourceFoundation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SourceFoundationEvaluation> {
    return this.sourceFoundationEvaluator.evaluateForFunction(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a function authority record by id' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FunctionAuthorityRecordResponseDto> {
    return this.recordsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a function authority record (preserves register history)' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.recordsService.update(id, dto);
  }
}
