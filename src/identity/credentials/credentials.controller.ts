import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';
import { QueryCredentialsDto } from './dto/query-credentials.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

@ApiTags('identity-credentials')
@Controller('identity/credentials')
@DenyByDefaultAdministrative()
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_CREATE)
  @ApiOperation({ summary: 'Create a credential for an identity' })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  create(@Body() dto: CreateCredentialDto): Promise<CredentialResponseDto> {
    return this.credentialsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_READ)
  @ApiOperation({ summary: 'List credentials' })
  @ApiOkResponse({ type: CredentialResponseDto, isArray: true })
  findAll(@Query() query: QueryCredentialsDto): Promise<CredentialResponseDto[]> {
    return this.credentialsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_READ)
  @ApiOperation({ summary: 'Get credential metadata by id' })
  @ApiOkResponse({ type: CredentialResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_UPDATE)
  @ApiOperation({ summary: 'Update credential metadata' })
  @ApiOkResponse({ type: CredentialResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCredentialDto,
  ): Promise<CredentialResponseDto> {
    return this.credentialsService.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_UPDATE)
  @ApiOperation({ summary: 'Activate a credential' })
  @ApiOkResponse({ type: CredentialResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.activate(id);
  }

  @Patch(':id/suspend')
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_UPDATE)
  @ApiOperation({ summary: 'Suspend a credential (deactivate without revoking)' })
  @ApiOkResponse({ type: CredentialResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.suspend(id);
  }

  @Patch(':id/revoke')
  @RequirePermissions(PermissionCodes.IDENTITY_CREDENTIAL_UPDATE)
  @ApiOperation({ summary: 'Revoke a credential' })
  @ApiOkResponse({ type: CredentialResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.revoke(id);
  }
}
