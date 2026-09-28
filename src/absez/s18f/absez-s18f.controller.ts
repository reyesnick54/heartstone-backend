import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { AbsezArticle9ServicePathMatrixService } from './article9/absez-article9-service-path-matrix.service';
import { FreeZoneCustomsService } from './customs/free-zone-customs.service';
import { InvestorResidencyProgramService } from './immigration/investor-residency-program.service';
import { InvestorRelationsService } from './investor-relations/investor-relations.service';
import { ZoneLandLeaseService } from './land/zone-land-lease.service';

@ApiTags('absez-s18f')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'ABSEZ institutional actor scope',
  authorityRequirement: 'Authority-gated consequential customs and residency outcomes',
  actorSource: 'Session identity',
  primarySecurityInvariant:
    'ABSEZ coordination does not substitute national customs or immigration determinations',
})
@Controller('absez/capability-closure')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class AbsezS18fController {
  constructor(
    private readonly freeZoneCustoms: FreeZoneCustomsService,
    private readonly investorResidency: InvestorResidencyProgramService,
    private readonly zoneLandLease: ZoneLandLeaseService,
    private readonly investorRelations: InvestorRelationsService,
    private readonly article9Matrix: AbsezArticle9ServicePathMatrixService,
  ) {}

  @Post('customs/cases')
  configureCustomsCase(
    @Body()
    body: {
      institutionId: string;
      jurisdictionId: string;
      governingSourceId?: string;
      shipmentReferenceId?: string;
      customsDeclarationId?: string;
    },
  ) {
    return this.freeZoneCustoms.configureCase(body);
  }

  @Post('customs/cases/:caseId/coordinate')
  coordinateCustoms(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.freeZoneCustoms.attemptConsequentialCoordination(caseId);
  }

  @Post('customs/cases/:caseId/external-determinations')
  recordExternalCustoms(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body()
    body: {
      externalAuthorityId: string;
      isAuthenticated: boolean;
      authenticatedPayload?: Record<string, unknown>;
      retainedNationalDeterminationId?: string;
      clientPayload?: Record<string, unknown>;
      actorIsOfficial?: boolean;
    },
  ) {
    return this.freeZoneCustoms.recordExternalCustomsDetermination({
      freeZoneCustomsCaseId: caseId,
      externalAuthorityId: body.externalAuthorityId,
      isAuthenticated: body.isAuthenticated,
      authenticatedPayload: body.authenticatedPayload,
      retainedNationalDeterminationId: body.retainedNationalDeterminationId,
      clientPayload: body.clientPayload,
      recordedByIdentityId: session.identityId,
      actorIsOfficial: body.actorIsOfficial ?? true,
    });
  }

  @Post('immigration/programs')
  configureImmigrationProgram(
    @Body()
    body: {
      programCode: string;
      programLabel: string;
      institutionId?: string;
      governingSourceId?: string;
    },
  ) {
    return this.investorResidency.configureProgram(body);
  }

  @Post('immigration/investor-applications')
  openInvestorResidencyApplication(
    @Body()
    body: {
      programCode: string;
      immigrationProfileId: string;
      caseId: string;
      applicationId: string;
      organizationId?: string;
      strategicProjectProfileId?: string;
    },
  ) {
    return this.investorResidency.openInvestorResidencyApplication(body);
  }

  @Post('land/leases')
  registerZoneLease(
    @Body()
    body: {
      institutionId: string;
      landParcelId: string;
      organizationId?: string;
      personId?: string;
      strategicProjectProfileId?: string;
      governingSourceId?: string;
      useTypeCode?: string;
    },
  ) {
    return this.zoneLandLease.registerLeaseDraft(body);
  }

  @Post('investor-relations/inquiries')
  createInvestorInquiry(
    @Body()
    body: {
      institutionId: string;
      organizationId: string;
      subjectSummary: string;
      strategicProjectProfileId?: string;
      caseId?: string;
      managerIdentityId?: string;
    },
  ) {
    return this.investorRelations.createInquiry(body);
  }

  @Get('article9/service-path-matrix')
  getArticle9Matrix() {
    return this.article9Matrix.buildMatrix();
  }

  @Post('article9/service-path-matrix/sync')
  syncArticle9States() {
    return this.article9Matrix.syncPersistedStates();
  }
}
