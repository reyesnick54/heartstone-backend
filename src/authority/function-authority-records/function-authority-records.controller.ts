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
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType, FunctionAuthorityLifecycleStatus } from '@prisma/client';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ConsequentialAction } from '../consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../consequential-action/consequential-action.guard';
import { resolveFunctionFromRouteParam } from '../consequential-action/consequential-action-resolvers';
import { ActivateFunctionAuthorityRecordDto } from './dto/activate-function-authority-record.dto';
import { CreateFunctionAuthorityRecordDto } from './dto/create-function-authority-record.dto';
import { FunctionAuthorityRecordResponseDto } from './dto/function-authority-record-response.dto';
import { FunctionActivationService } from './function-activation.service';
import { FunctionAuthorityRecordsService } from './function-authority-records.service';

@ApiTags('authority-functions')
@Controller('authority/functions')
@DenyByDefaultAdministrative()
export class FunctionAuthorityRecordsController {
  constructor(
    private readonly service: FunctionAuthorityRecordsService,
    private readonly activationService: FunctionActivationService,
  ) {}

  @Post()
  @RequirePermissions(PermissionCodes.AUTHORITY_FUNCTION_RECORD_CREATE)
  @ApiOperation({ summary: 'Create a function authority record (draft)' })
  @ApiCreatedResponse({ type: FunctionAuthorityRecordResponseDto })
  create(
    @Body() dto: CreateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.AUTHORITY_FUNCTION_RECORD_READ)
  @ApiOperation({ summary: 'List function authority records' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto, isArray: true })
  findAll(
    @Query('lifecycleStatus') lifecycleStatus?: FunctionAuthorityLifecycleStatus,
  ): Promise<FunctionAuthorityRecordResponseDto[]> {
    return this.service.findAll({ lifecycleStatus });
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.AUTHORITY_FUNCTION_RECORD_READ)
  @ApiOperation({ summary: 'Get a function authority record by id' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FunctionAuthorityRecordResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id/activate')
  @RequirePermissions(PermissionCodes.AUTHORITY_FUNCTION_RECORD_ACTIVATE)
  @ApiOperation({ summary: 'Activate a function authority record (controlled, audited)' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  activate(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.activationService.activate(id, {
      actorIdentityId: session.identityId,
      officeholderId: dto.officeholderId,
      officeId: dto.officeId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      reason: dto.reason,
    });
  }

  @Patch(':id/suspend')
  @RequirePermissions(PermissionCodes.AUTHORITY_FUNCTION_RECORD_ACTIVATE)
  @UseGuards(SessionAuthGuard, ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.SUSPEND,
    functionResolver: resolveFunctionFromRouteParam,
    institutionalFieldPrefixes: ['actor'],
    requireHumanActor: true,
  })
  @ApiOperation({ summary: 'Suspend an active function authority record' })
  @ApiOkResponse({ type: FunctionAuthorityRecordResponseDto })
  suspend(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    return this.activationService.suspend(id, {
      actorIdentityId: session.identityId,
      officeholderId: dto.officeholderId,
      officeId: dto.officeId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      reason: dto.reason,
    });
  }
}
