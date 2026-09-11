import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FunctionAuthorityLifecycleStatus } from '@prisma/client';

import { ActivateFunctionAuthorityRecordDto } from './dto/activate-function-authority-record.dto';
import { CreateFunctionAuthorityRecordDto } from './dto/create-function-authority-record.dto';
import { FunctionAuthorityRecordResponseDto } from './dto/function-authority-record-response.dto';
import { FunctionActivationService } from './function-activation.service';
import { FunctionAuthorityRecordsService } from './function-authority-records.service';

@ApiTags('authority-functions')
@Controller('authority/functions')
export class FunctionAuthorityRecordsController {
  constructor(
    private readonly service: FunctionAuthorityRecordsService,
    private readonly activationService: FunctionActivationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a function authority record (draft)' })
  @ApiCreatedResponse({ type: FunctionAuthorityRecordResponseDto })
  create(
    @Body() dto: CreateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List function authority records' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto, isArray: true })
  findAll(
    @Query('lifecycleStatus') lifecycleStatus?: FunctionAuthorityLifecycleStatus,
  ): Promise<FunctionAuthorityRecordResponseDto[]> {
    return this.service.findAll({ lifecycleStatus });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a function authority record by id' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FunctionAuthorityRecordResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a function authority record (controlled, audited)' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.activationService.activate(id, dto);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active function authority record' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.activationService.suspend(id, dto);
  }
}
