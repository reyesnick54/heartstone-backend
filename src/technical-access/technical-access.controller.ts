import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { DenyByDefaultAdministrative } from './authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from './authorization/require-permissions.decorator';
import { PermissionCodes } from './constants/permission-codes.constants';
import { CreateTechnicalRoleAssignmentDto } from './dto/create-technical-role-assignment.dto';
import { TechnicalRoleAssignmentResponseDto } from './dto/technical-role-assignment-response.dto';
import { TechnicalRoleAssignmentService } from './services/technical-role-assignment.service';

@ApiTags('identity-technical-access')
@Controller('identity/technical-access')
@DenyByDefaultAdministrative()
@UseGuards(SessionAuthGuard)
export class TechnicalAccessController {
  constructor(private readonly assignments: TechnicalRoleAssignmentService) {}

  @Post('role-assignments')
  @RequirePermissions(PermissionCodes.IDENTITY_TECHNICAL_ACCESS_ROLE_ASSIGN)
  @ApiOperation({ summary: 'Assign a bootstrap technical role to an identity' })
  @ApiCreatedResponse({ type: TechnicalRoleAssignmentResponseDto })
  assignRole(
    @Body() dto: CreateTechnicalRoleAssignmentDto,
    @CurrentSession() session: SessionContextDto,
  ): Promise<TechnicalRoleAssignmentResponseDto> {
    return this.assignments.assignRole(dto, session);
  }

  @Get('identities/:identityId/role-assignments')
  @RequirePermissions(PermissionCodes.IDENTITY_TECHNICAL_ACCESS_READ)
  @ApiOperation({ summary: 'List technical role assignments for an identity' })
  @ApiOkResponse({ type: TechnicalRoleAssignmentResponseDto, isArray: true })
  listAssignments(
    @Param('identityId', ParseUUIDPipe) identityId: string,
  ): Promise<TechnicalRoleAssignmentResponseDto[]> {
    return this.assignments.listForIdentity(identityId);
  }
}
