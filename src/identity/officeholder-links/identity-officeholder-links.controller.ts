import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { IdentityAdminGuard } from '../auth/identity-admin.guard';
import { AuthenticatedPrincipal } from '../auth/principal.types';
import { ActivateOfficeholderLinkDto } from './dto/activate-officeholder-link.dto';
import { OfficeholderLinkResponseDto } from './dto/officeholder-link-response.dto';
import { RequestOfficeholderLinkDto } from './dto/request-officeholder-link.dto';
import { IdentityOfficeholderLinksService } from './identity-officeholder-links.service';

@ApiTags('identity-officeholder-links')
@Controller('identity/officeholder-links')
@UseGuards(AuthGuard)
export class IdentityOfficeholderLinksController {
  constructor(
    private readonly linksService: IdentityOfficeholderLinksService,
    private readonly authService: AuthService,
  ) {}

  @Post('request')
  @ApiOperation({ summary: 'Request an identity-to-officeholder linkage (pending verification)' })
  @ApiCreatedResponse({ type: OfficeholderLinkResponseDto })
  async requestLink(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() dto: RequestOfficeholderLinkDto,
  ): Promise<OfficeholderLinkResponseDto> {
    const personId = this.authService.requirePersonId(principal);
    this.linksService.assertCanRequestForSelf(principal, personId, dto.officeholderId);

    const link = await this.linksService.requestLink({
      personId,
      userAccountId: principal.accountId,
      officeholderId: dto.officeholderId,
      evidenceReference: dto.evidenceReference,
      actor: principal,
      correlationId: principal.correlationId,
      source: 'api',
    });

    return OfficeholderLinkResponseDto.fromEntity(link);
  }

  @Patch(':id/activate')
  @UseGuards(IdentityAdminGuard)
  @ApiOperation({ summary: 'Activate a pending officeholder linkage (admin only)' })
  @ApiOkResponse({ type: OfficeholderLinkResponseDto })
  async activateLink(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateOfficeholderLinkDto,
  ): Promise<OfficeholderLinkResponseDto> {
    const link = await this.linksService.activateLink({
      linkId: id,
      verificationMethod: dto.verificationMethod,
      evidenceReference: dto.evidenceReference,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      actor: principal,
      correlationId: principal.correlationId,
      source: 'api',
    });

    return OfficeholderLinkResponseDto.fromEntity(link);
  }

  @Patch(':id/suspend')
  @UseGuards(IdentityAdminGuard)
  @ApiOperation({ summary: 'Suspend a verified officeholder linkage (admin only)' })
  @ApiOkResponse({ type: OfficeholderLinkResponseDto })
  async suspendLink(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OfficeholderLinkResponseDto> {
    const link = await this.linksService.suspendLink(
      id,
      principal,
      undefined,
      principal.correlationId,
    );
    return OfficeholderLinkResponseDto.fromEntity(link);
  }

  @Patch(':id/revoke')
  @UseGuards(IdentityAdminGuard)
  @ApiOperation({ summary: 'Revoke an officeholder linkage (admin only)' })
  @ApiOkResponse({ type: OfficeholderLinkResponseDto })
  async revokeLink(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OfficeholderLinkResponseDto> {
    const link = await this.linksService.revokeLink(
      id,
      principal,
      undefined,
      principal.correlationId,
    );
    return OfficeholderLinkResponseDto.fromEntity(link);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get the current verified officeholder linkage for the authenticated person',
  })
  @ApiOkResponse({ type: OfficeholderLinkResponseDto })
  async getCurrent(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<OfficeholderLinkResponseDto> {
    const personId = this.authService.requirePersonId(principal);
    const link = await this.linksService.findCurrentForPerson(personId);

    if (!link) {
      throw new NotFoundException('No current verified officeholder linkage');
    }

    return OfficeholderLinkResponseDto.fromEntity(link);
  }

  @Get()
  @UseGuards(IdentityAdminGuard)
  @ApiOperation({ summary: 'List all identity-to-officeholder linkages (admin only)' })
  @ApiOkResponse({ type: OfficeholderLinkResponseDto, isArray: true })
  async listAll(): Promise<OfficeholderLinkResponseDto[]> {
    const links = await this.linksService.listAll();
    return links.map((link) => OfficeholderLinkResponseDto.fromEntity(link));
  }

  @Get('mine')
  @ApiOperation({ summary: 'List officeholder linkages for the authenticated person' })
  @ApiOkResponse({ type: OfficeholderLinkResponseDto, isArray: true })
  async listMine(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<OfficeholderLinkResponseDto[]> {
    const personId = this.authService.requirePersonId(principal);
    const links = await this.linksService.listForPerson(personId);
    return links.map((link) => OfficeholderLinkResponseDto.fromEntity(link));
  }
}
