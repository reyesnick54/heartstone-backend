import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoverningSourceStatus } from '@prisma/client';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { AuthenticateGoverningSourceDto } from './dto/authenticate-governing-source.dto';
import { CreateGoverningSourceDto } from './dto/create-governing-source.dto';
import { GoverningSourceResponseDto } from './dto/governing-source-response.dto';
import { GoverningSourcesService } from './governing-sources.service';

@ApiTags('authority-governing-sources')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Authority configuration or evaluated institutional action scope',
  authorityRequirement: 'Explicit function authority evaluation for consequential actions',
  actorSource: 'Session identity; the authenticating officer is never taken from the request',
  primarySecurityInvariant: 'Technical permission does not create legal authority',
})
@Controller('authority/governing-sources')
export class GoverningSourcesController {
  constructor(private readonly service: GoverningSourcesService) {}

  @Post()
  @RequirePermissions(PermissionCodes.AUTHORITY_GOVERNING_SOURCE_CREATE)
  @ApiOperation({ summary: 'Create a governing source (draft)' })
  @ApiCreatedResponse({ type: GoverningSourceResponseDto })
  create(@Body() dto: CreateGoverningSourceDto): Promise<GoverningSourceResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.AUTHORITY_GOVERNING_SOURCE_READ)
  @ApiOperation({ summary: 'List governing sources' })
  @ApiOkResponse({ type: GoverningSourceResponseDto, isArray: true })
  findAll(@Query('status') status?: GoverningSourceStatus): Promise<GoverningSourceResponseDto[]> {
    return this.service.findAll({ status });
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.AUTHORITY_GOVERNING_SOURCE_READ)
  @ApiOperation({ summary: 'Get a governing source by id' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GoverningSourceResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id/authenticate')
  @RequirePermissions(PermissionCodes.AUTHORITY_GOVERNING_SOURCE_AUTHENTICATE)
  @ApiOperation({
    summary: 'Record that an authenticated copy of this governing source was verified',
    description:
      'The authenticating officer is the signed-in identity. The request cannot name someone else.',
  })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  authenticate(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AuthenticateGoverningSourceDto,
  ): Promise<GoverningSourceResponseDto> {
    return this.service.authenticate(id, {
      actorIdentityId: session.identityId,
      sessionId: session.sessionId,
      verificationReference: dto.verificationReference,
    });
  }

  @Patch(':id/revoke')
  @RequirePermissions(PermissionCodes.AUTHORITY_GOVERNING_SOURCE_REVOKE)
  @ApiOperation({ summary: 'Revoke a governing source' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  revoke(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoverningSourceResponseDto> {
    return this.service.revoke(id, {
      actorIdentityId: session.identityId,
      sessionId: session.sessionId,
    });
  }
}
