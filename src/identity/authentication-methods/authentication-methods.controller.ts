import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { AuthenticationMethodsService } from './authentication-methods.service';
import { AuthenticationMethodResponseDto } from './dto/authentication-method-response.dto';
import { CreateAuthenticationMethodDto } from './dto/create-authentication-method.dto';
import { QueryAuthenticationMethodsDto } from './dto/query-authentication-methods.dto';
import { UpdateAuthenticationMethodDto } from './dto/update-authentication-method.dto';

@ApiTags('identity-authentication-methods')
@Controller('identity/authentication-methods')
@DenyByDefaultAdministrative()
export class AuthenticationMethodsController {
  constructor(private readonly authenticationMethodsService: AuthenticationMethodsService) {}

  @Post()
  @RequirePermissions(PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_CREATE)
  @ApiOperation({ summary: 'Configure an authentication method for an identity' })
  @ApiCreatedResponse({ type: AuthenticationMethodResponseDto })
  create(@Body() dto: CreateAuthenticationMethodDto): Promise<AuthenticationMethodResponseDto> {
    return this.authenticationMethodsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_READ)
  @ApiOperation({ summary: 'List authentication methods' })
  @ApiOkResponse({ type: AuthenticationMethodResponseDto, isArray: true })
  findAll(
    @Query() query: QueryAuthenticationMethodsDto,
  ): Promise<AuthenticationMethodResponseDto[]> {
    return this.authenticationMethodsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_READ)
  @ApiOperation({ summary: 'Get an authentication method by id' })
  @ApiOkResponse({ type: AuthenticationMethodResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuthenticationMethodResponseDto> {
    return this.authenticationMethodsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_UPDATE)
  @ApiOperation({ summary: 'Update authentication method metadata' })
  @ApiOkResponse({ type: AuthenticationMethodResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuthenticationMethodDto,
  ): Promise<AuthenticationMethodResponseDto> {
    return this.authenticationMethodsService.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions(PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_UPDATE)
  @ApiOperation({ summary: 'Enable an authentication method' })
  @ApiOkResponse({ type: AuthenticationMethodResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<AuthenticationMethodResponseDto> {
    return this.authenticationMethodsService.activate(id);
  }

  @Patch(':id/suspend')
  @RequirePermissions(PermissionCodes.IDENTITY_AUTHENTICATION_METHOD_UPDATE)
  @ApiOperation({ summary: 'Disable an authentication method' })
  @ApiOkResponse({ type: AuthenticationMethodResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<AuthenticationMethodResponseDto> {
    return this.authenticationMethodsService.suspend(id);
  }
}
