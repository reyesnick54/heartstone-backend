import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { QueryMembershipsDto } from './dto/query-memberships.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('identity-memberships')
@Controller('identity/memberships')
@DenyByDefaultAdministrative()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_CREATE)
  @ApiOperation({ summary: 'Create an organization membership' })
  @ApiCreatedResponse({ type: MembershipResponseDto })
  create(@Body() dto: CreateMembershipDto): Promise<MembershipResponseDto> {
    return this.membershipsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_READ)
  @ApiOperation({ summary: 'List organization memberships' })
  @ApiOkResponse({ type: MembershipResponseDto, isArray: true })
  findAll(@Query() query: QueryMembershipsDto): Promise<MembershipResponseDto[]> {
    return this.membershipsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_READ)
  @ApiOperation({ summary: 'Get an organization membership by id' })
  @ApiOkResponse({ type: MembershipResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MembershipResponseDto> {
    return this.membershipsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE)
  @ApiOperation({ summary: 'Update membership metadata' })
  @ApiOkResponse({ type: MembershipResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipDto,
  ): Promise<MembershipResponseDto> {
    return this.membershipsService.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE)
  @ApiOperation({ summary: 'Activate an organization membership' })
  @ApiOkResponse({ type: MembershipResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<MembershipResponseDto> {
    return this.membershipsService.activate(id);
  }

  @Patch(':id/suspend')
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE)
  @ApiOperation({ summary: 'Suspend an organization membership' })
  @ApiOkResponse({ type: MembershipResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<MembershipResponseDto> {
    return this.membershipsService.suspend(id);
  }

  @Patch(':id/revoke')
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE)
  @ApiOperation({ summary: 'Revoke an organization membership' })
  @ApiOkResponse({ type: MembershipResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<MembershipResponseDto> {
    return this.membershipsService.revoke(id);
  }

  @Patch(':id/end')
  @RequirePermissions(PermissionCodes.IDENTITY_MEMBERSHIP_UPDATE)
  @ApiOperation({ summary: 'End an organization membership' })
  @ApiOkResponse({ type: MembershipResponseDto })
  end(@Param('id', ParseUUIDPipe) id: string): Promise<MembershipResponseDto> {
    return this.membershipsService.end(id);
  }
}
