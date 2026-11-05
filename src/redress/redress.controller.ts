import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import {
  resolveFunctionFromRedressMatter,
  resolveResourceFromRedressMatter,
} from '../authority/consequential-action/consequential-action-resolvers';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { RequirePermissions } from '../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../technical-access/constants/permission-codes.constants';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { CreateExternalReviewReferralDto } from './dto/create-external-review-referral.dto';
import { RecordExternalDeterminationDto } from './dto/record-external-determination.dto';
import { ExternalReviewDeterminationService } from './external-review/external-review-determination.service';
import { ExternalReviewPackageService } from './external-review/external-review-package.service';
import { ExternalReviewReferralService } from './external-review/external-review-referral.service';
import { RedressImplementationService } from './implementation/redress-implementation.service';
import { InterimReliefService } from './interim-relief/interim-relief.service';
import { RedressMatterService } from './matters/redress-matter.service';
import { RedressNoticeService } from './notices/redress-notice.service';
import { PHASE_10F_BOUNDARY_DISCLAIMER, PHASE_10G_BOUNDARY_DISCLAIMER } from './redress.constants';

@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Redress and appeals administration',
  authorityRequirement: 'Institutional redress handling authority',
  actorSource: 'Authenticated institutional actor',
  primarySecurityInvariant: 'Redress access does not bypass original decision authority chain',
})
@Controller('redress')
export class RedressController {
  constructor(
    private readonly boundary: RedressBoundaryService,
    private readonly matters: RedressMatterService,
    private readonly decisions: RedressDecisionService,
    private readonly interimRelief: InterimReliefService,
    private readonly implementation: RedressImplementationService,
    private readonly notices: RedressNoticeService,
    private readonly externalReferrals: ExternalReviewReferralService,
    private readonly externalPackages: ExternalReviewPackageService,
    private readonly externalDeterminations: ExternalReviewDeterminationService,
  ) {}

  @Get('boundary')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_READ)
  getBoundaryDisclaimer(): { disclaimer: string; externalDisclaimer: string } {
    return {
      disclaimer: PHASE_10G_BOUNDARY_DISCLAIMER,
      externalDisclaimer: PHASE_10F_BOUNDARY_DISCLAIMER,
    };
  }

  @Post('matters')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  fileMatter(@Body() body: Parameters<RedressMatterService['fileMatter']>[0]) {
    return this.matters.fileMatter(body);
  }

  @Get('matters/:id')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_READ)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  getMatter(@CurrentSession() session: SessionContextDto, @Param('id') id: string) {
    return this.matters.findById(id, session);
  }

  @Post('decisions')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  @UseGuards(SessionAuthGuard, ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.HEAR_REVIEW,
    functionResolver: resolveFunctionFromRedressMatter,
    resourceResolver: resolveResourceFromRedressMatter,
    institutionalFieldPrefixes: ['reviewer'],
  })
  recordDecision(
    @CurrentSession() session: SessionContextDto,
    @Body() body: Parameters<RedressDecisionService['recordDecision']>[0],
  ) {
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    // The deciding reviewer is the signed-in officer whose authority the guard evaluated.
    assertReviewerIsActor(body.reviewerIdentityId, session.identityId);
    return this.decisions.recordDecision({
      ...body,
      reviewerIdentityId: session.identityId,
    });
  }

  @Post('interim-relief/requests')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  requestInterimRelief(@Body() body: Parameters<InterimReliefService['requestInterimRelief']>[0]) {
    return this.interimRelief.requestInterimRelief(body);
  }

  @Post('interim-relief/decisions')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  @UseGuards(SessionAuthGuard, ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.HEAR_REVIEW,
    functionResolver: resolveFunctionFromRedressMatter,
    resourceResolver: resolveResourceFromRedressMatter,
    institutionalFieldPrefixes: ['reviewer'],
  })
  decideInterimRelief(
    @CurrentSession() session: SessionContextDto,
    @Body() body: Parameters<InterimReliefService['decideInterimRelief']>[0],
  ) {
    assertReviewerIsActor(body.reviewerIdentityId, session.identityId);
    return this.interimRelief.decideInterimRelief({
      ...body,
      reviewerIdentityId: session.identityId,
    });
  }

  @Get('decisions/:id/implementation-status')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_READ)
  async getImplementationStatus(@Param('id') id: string) {
    const status = await this.implementation.getImplementationStatus(id);
    const implemented = await this.implementation.isRemedyFullyImplemented(id);
    return { status, implemented };
  }

  @Post('notices/prepare')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  prepareNotice(@Body() body: Parameters<RedressNoticeService['prepareNotice']>[0]) {
    return this.notices.prepareNotice(body);
  }

  @Post('external-referrals')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  createExternalReferral(@Body() body: CreateExternalReviewReferralDto) {
    return this.externalReferrals.create(body);
  }

  @Get('external-referrals/:id')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_READ)
  getExternalReferral(@Param('id') id: string) {
    return this.externalReferrals.getReferral(id);
  }

  @Post('external-referrals/:id/packages')
  @RequirePermissions(PermissionCodes.REDRESS_MATTER_MANAGE)
  createExternalPackage(
    @Param('id') referralId: string,
    @Body('evidencePacketVersionId') evidencePacketVersionId: string,
  ) {
    return this.externalPackages.createPinnedPackage({
      referralId,
      evidencePacketVersionId,
    });
  }

  @Post('external-referrals/:id/determinations')
  @RequirePermissions(PermissionCodes.REDRESS_DETERMINATION_RECORD)
  recordExternalDetermination(
    @Param('id') referralId: string,
    @Body() body: RecordExternalDeterminationDto,
  ) {
    return this.externalDeterminations.record({
      referralId,
      sourceAuthority: body.sourceAuthority,
      outcomeText: body.outcomeText,
      receivedDate: new Date(body.receivedDate),
      officialReference: body.officialReference,
      decisionDate: body.decisionDate ? new Date(body.decisionDate) : undefined,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      reasonsReference: body.reasonsReference,
      stayInterimEffect: body.stayInterimEffect,
      remedyText: body.remedyText,
      furtherRightsText: body.furtherRightsText,
      instrumentOrderReference: body.instrumentOrderReference,
      conditionsText: body.conditionsText,
      implementationRequirements: body.implementationRequirements,
      verificationMethod: body.verificationMethod,
      bindingClass: body.bindingClass,
      authenticityStatus: body.authenticityStatus,
      authenticityVerificationRef: body.authenticityVerificationRef,
      isAuthenticated: body.isAuthenticated,
    });
  }
}

/** A redress decision cannot be attributed to anyone but the signed-in reviewer. */
function assertReviewerIsActor(requested: string | undefined, actorIdentityId: string): void {
  if (requested && requested !== actorIdentityId) {
    throw new ForbiddenException(
      'reviewerIdentityId must be the signed-in reviewer; decisions cannot be attributed to others',
    );
  }
}
