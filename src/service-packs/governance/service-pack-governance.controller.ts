import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../../authority/consequential-action/consequential-action.guard';
import { AUTHORITY_EVALUATION_REQUEST_KEY } from '../../authority/consequential-action/consequential-action.guard';
import { type AuthorityEvaluationResponseDto } from '../../authority/evaluation/dto/authority-evaluation-response.dto';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  resolveFunctionFromServicePackRoute,
  resolveResourceFromServicePackRoute,
} from './consequential-action-resolvers';
import { AcceptServicePackDto } from './dto/accept-service-pack.dto';
import { AddReviewFindingDto } from './dto/add-review-finding.dto';
import { CreateServicePackReviewDto } from './dto/create-service-pack-review.dto';
import { RejectServicePackDto } from './dto/reject-service-pack.dto';
import { RequestRevisionDto } from './dto/request-revision.dto';
import { ResolveFindingDto } from './dto/resolve-finding.dto';
import { SubmitForAcceptanceDto } from './dto/submit-for-acceptance.dto';
import { ServicePackAcceptanceService } from './service-pack-acceptance.service';
import { ServicePackGovernanceBoundaryService } from './service-pack-governance-boundary.service';
import { ServicePackReviewService } from './service-pack-review.service';

@ApiTags('service-packs-governance')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('service-packs')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
export class ServicePackGovernanceController {
  constructor(
    private readonly boundary: ServicePackGovernanceBoundaryService,
    private readonly reviews: ServicePackReviewService,
    private readonly acceptance: ServicePackAcceptanceService,
  ) {}

  @Get(':id/reviews')
  @ApiOperation({ summary: 'List governance reviews for a service pack' })
  listReviews(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.listReviews(id);
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: 'Start or list configured governance reviews for a version' })
  createReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: CreateServicePackReviewDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    return this.reviews.createReview(id, actor, dto);
  }

  @Post(':id/reviews/:reviewId/findings')
  @ApiOperation({ summary: 'Record a structured governance review finding' })
  addFinding(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: AddReviewFindingDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    this.boundary.assertReviewerCommentDoesNotCreateAuthority(
      dto as unknown as Record<string, unknown>,
    );
    return this.reviews.addFinding(id, reviewId, actor, dto);
  }

  @Post(':id/reviews/:reviewId/request-revision')
  @ApiOperation({ summary: 'Request manifest revision after governance review' })
  requestRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.reviews.requestRevision(id, reviewId, actor, dto);
  }

  @Post(':id/reviews/:reviewId/resolve-finding')
  @ApiOperation({ summary: 'Resolve a governance review finding' })
  resolveFinding(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: ResolveFindingDto,
    @Req()
    request: {
      [AUTHORITY_EVALUATION_REQUEST_KEY]?: AuthorityEvaluationResponseDto;
    },
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    const authorityEvaluationAllowed =
      request[AUTHORITY_EVALUATION_REQUEST_KEY]?.outcome === 'ALLOW';
    return this.reviews.resolveFinding(
      id,
      reviewId,
      dto.findingId,
      actor,
      dto,
      authorityEvaluationAllowed,
    );
  }

  @Post(':id/submit-for-acceptance')
  @ApiOperation({ summary: 'Submit a validated service pack version for institutional acceptance' })
  submitForAcceptance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: SubmitForAcceptanceDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    return this.acceptance.submitForAcceptance(id, actor, dto);
  }

  @Post(':id/accept')
  @ConsequentialAction({
    action: AuthorityActionType.APPROVE,
    functionResolver: resolveFunctionFromServicePackRoute,
    resourceResolver: resolveResourceFromServicePackRoute,
    requireHumanActor: true,
  })
  @ApiOperation({ summary: 'Institutionally accept a service pack version (consequential action)' })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: AcceptServicePackDto,
    @Req()
    request: {
      [AUTHORITY_EVALUATION_REQUEST_KEY]: AuthorityEvaluationResponseDto;
    },
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    return this.acceptance.acceptInstitutionally(
      id,
      actor,
      dto,
      request[AUTHORITY_EVALUATION_REQUEST_KEY],
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a service pack version under governance' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: ActorContext,
    @Body() dto: RejectServicePackDto,
  ) {
    this.boundary.rejectClientGovernanceIdentityFields(dto as unknown as Record<string, unknown>);
    return this.acceptance.reject(id, actor, dto);
  }
}
