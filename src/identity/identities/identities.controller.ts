import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { CreateIdentityDto } from './dto/create-identity.dto';
import { IdentityResponseDto } from './dto/identity-response.dto';
import { QueryIdentitiesDto } from './dto/query-identities.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { IdentitiesService } from './identities.service';

@ApiTags('identity-identities')
@Controller('identity/identities')
@DenyByDefaultAdministrative()
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @Post()
  @RequirePermissions(PermissionCodes.IDENTITY_IDENTITY_CREATE)
  @ApiOperation({ summary: 'Create an identity' })
  @ApiCreatedResponse({ type: IdentityResponseDto })
  create(@Body() dto: CreateIdentityDto): Promise<IdentityResponseDto> {
    return this.identitiesService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.IDENTITY_IDENTITY_READ)
  @ApiOperation({ summary: 'List identities' })
  @ApiOkResponse({ type: IdentityResponseDto, isArray: true })
  findAll(@Query() query: QueryIdentitiesDto): Promise<IdentityResponseDto[]> {
    return this.identitiesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_IDENTITY_READ)
  @ApiOperation({ summary: 'Get an identity by id' })
  @ApiOkResponse({ type: IdentityResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IdentityResponseDto> {
    return this.identitiesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_IDENTITY_UPDATE)
  @ApiOperation({ summary: 'Update identity metadata' })
  @ApiOkResponse({ type: IdentityResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIdentityDto,
  ): Promise<IdentityResponseDto> {
    return this.identitiesService.update(id, dto);
  }
}
