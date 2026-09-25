import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../../identity/auth/decorators/current-actor.decorator';
import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../../security/route-class.enum';
import { ExperienceActionsResponseDto } from '../dto/experience-action.dto';
import { ExperienceInboxResponseDto } from '../dto/experience-inbox.dto';
import { ExperienceNavigationResponseDto } from '../dto/experience-navigation.dto';
import {
  ExperienceDeepLinkResolveRequestDto,
  ExperienceDeepLinkResolveResponseDto,
  ExperienceResponseMetadataDto,
} from '../dto/experience-response-metadata.dto';
import {
  ExperienceSearchQueryDto,
  ExperienceSearchResponseDto,
} from '../dto/experience-search.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { ExperienceActionCenterService } from '../services/experience-action-center.service';
import { ExperienceActorResolverService } from '../services/experience-actor-resolver.service';
import { ExperienceDeepLinkService } from '../services/experience-deep-link.service';
import { ExperienceInboxService } from '../services/experience-inbox.service';
import { ExperienceNavigationService } from '../services/experience-navigation.service';
import { ExperienceResponseMetadataService } from '../services/experience-response-metadata.service';
import { UnifiedExperienceSearchService } from '../services/unified-experience-search.service';

@ApiTags('experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ExperienceCommonController {
  constructor(
    private readonly actorResolver: ExperienceActorResolverService,
    private readonly searchService: UnifiedExperienceSearchService,
    private readonly navigationService: ExperienceNavigationService,
    private readonly inboxService: ExperienceInboxService,
    private readonly actionCenterService: ExperienceActionCenterService,
    private readonly deepLinkService: ExperienceDeepLinkService,
    private readonly metadataService: ExperienceResponseMetadataService,
  ) {}

  @Get('metadata')
  @ApiOperation({ summary: 'Experience response metadata and localization contract' })
  @ApiOkResponse({ type: ExperienceResponseMetadataDto })
  async getMetadata(
    @CurrentActor() actor: ActorContext,
    @Query('locale') locale?: string,
  ): Promise<ExperienceResponseMetadataDto> {
    const resolved = await this.actorResolver.resolve(actor, { locale });
    return this.metadataService.buildMetadata(resolved);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Unified scoped experience search',
    description:
      'Search within actor-visible resources only. Cross-government enumeration is not permitted.',
  })
  @ApiOkResponse({ type: ExperienceSearchResponseDto })
  async search(
    @CurrentActor() actor: ActorContext,
    @Query() query: ExperienceSearchQueryDto,
    @Query('locale') locale?: string,
  ): Promise<ExperienceSearchResponseDto> {
    const resolved = await this.actorResolver.resolve(actor, { locale });
    return this.searchService.search(resolved, query);
  }

  @Get('navigation')
  @ApiOperation({
    summary: 'Persona-based frontend navigation metadata',
    description:
      'Returns navigation items appropriate to the authenticated actor. Does not grant access to protected functionality.',
  })
  @ApiOkResponse({ type: ExperienceNavigationResponseDto })
  async getNavigation(
    @CurrentActor() actor: ActorContext,
    @Query('locale') locale?: string,
  ): Promise<ExperienceNavigationResponseDto> {
    const resolved = await this.actorResolver.resolve(actor, { locale });
    return this.navigationService.buildNavigation(resolved);
  }

  @Get('inbox')
  @ApiOperation({
    summary: 'Normalized inbox aggregation',
    description:
      'Aggregates secure messages, notices, and updates without duplicating CommunicationMessage records.',
  })
  @ApiOkResponse({ type: ExperienceInboxResponseDto })
  async getInbox(
    @CurrentActor() actor: ActorContext,
    @Query() query: PaginationQueryDto,
    @Query('locale') locale?: string,
  ): Promise<ExperienceInboxResponseDto> {
    const resolved = await this.actorResolver.resolve(actor, { locale });
    return this.inboxService.listInbox(resolved, query);
  }

  @Get('actions')
  @ApiOperation({
    summary: 'Normalized action center',
    description:
      'Shared action contracts for citizen, business, and official personas. Presentation only; execution re-evaluates authorization.',
  })
  @ApiOkResponse({ type: ExperienceActionsResponseDto })
  async getActions(
    @CurrentActor() actor: ActorContext,
    @Query() query: PaginationQueryDto,
    @Query('caseId') caseId?: string,
    @Query('locale') locale?: string,
  ): Promise<ExperienceActionsResponseDto> {
    const resolved = await this.actorResolver.resolve(actor, { locale });
    return this.actionCenterService.listActions(resolved, query, { caseId });
  }

  @Post('deep-links/resolve')
  @ApiOperation({
    summary: 'Resolve and authorize a deep link',
    description:
      'Confirms whether the authenticated actor may navigate to a deep link target. Does not bypass backend authorization.',
  })
  @ApiOkResponse({ type: ExperienceDeepLinkResolveResponseDto })
  async resolveDeepLink(
    @CurrentActor() actor: ActorContext,
    @Body() body: ExperienceDeepLinkResolveRequestDto,
    @CurrentSession() _session: SessionContextDto,
    @Query('locale') locale?: string,
  ): Promise<ExperienceDeepLinkResolveResponseDto> {
    const resolved = await this.actorResolver.resolve(actor, { locale });
    return this.deepLinkService.resolveDeepLink(resolved, body);
  }
}
