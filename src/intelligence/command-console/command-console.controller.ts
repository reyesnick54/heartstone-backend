import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { type AuthenticatedPrincipal } from '../../identity/auth/domain/authenticated-principal';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { DashboardBoundaryService } from './dashboard-boundary.service';
import { DashboardIndicatorProjectionService } from './dashboard-indicator-projection.service';
import { DashboardQueryService } from './dashboard-query.service';
import { DashboardSnapshotService } from './dashboard-snapshot.service';
import { CaptureSnapshotDto } from './dto/capture-snapshot.dto';
import { DeriveIndicatorProjectionDto } from './dto/derive-indicator-projection.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@ApiTags('intelligence/command-console')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('intelligence/command-console')
export class CommandConsoleController {
  constructor(
    private readonly boundaryService: DashboardBoundaryService,
    private readonly projectionService: DashboardIndicatorProjectionService,
    private readonly queryService: DashboardQueryService,
    private readonly snapshotService: DashboardSnapshotService,
  ) {}

  @Post('projections/derive')
  @ApiOperation({
    summary: 'Derive dashboard indicator projection from authoritative records',
    description: 'Actor identity is server-derived; clients cannot supply identity or entitlement fields.',
  })
  deriveProjection(
    @CurrentActor() actor: AuthenticatedPrincipal,
    @Body() body: DeriveIndicatorProjectionDto,
  ) {
    this.boundaryService.rejectClientSuppliedActorIdentity(body as unknown as Record<string, unknown>);
    this.boundaryService.assertClientCannotSetDashboardProjection(
      body as unknown as Record<string, unknown>,
    );
    return this.projectionService.deriveProjection({
      indicatorDefinitionId: body.indicatorDefinitionId,
      dashboardVersionId: body.dashboardVersionId,
      institutionId: body.institutionId,
      departmentId: body.departmentId,
      caseId: body.caseId,
      countValue: body.countValue,
      scoreValue: body.scoreValue,
      dataQuality: body.dataQuality,
      calculatedAt: body.calculatedAt ? new Date(body.calculatedAt) : undefined,
      sourceFreshness: body.sourceFreshness ? new Date(body.sourceFreshness) : undefined,
      staleAfter: body.staleAfter ? new Date(body.staleAfter) : undefined,
      sourceAvailability: body.sourceAvailability,
      limitations: body.limitations,
      ownerIdentityId: actor.identityId,
      drilldowns: body.drilldowns.map((d) => ({
        referenceType: d.referenceType,
        referenceId: d.referenceId,
        referenceLabel: d.referenceLabel,
        evidencePacketId: d.evidencePacketId,
        sourceStatus: d.sourceStatus,
        ownerReference: d.ownerReference,
        effectiveDate: d.effectiveDate ? new Date(d.effectiveDate) : undefined,
        lastRefresh: d.lastRefresh ? new Date(d.lastRefresh) : undefined,
        revalidationDate: d.revalidationDate ? new Date(d.revalidationDate) : undefined,
        limitations: d.limitations,
      })),
    });
  }

  @Post('executive/query')
  @ApiOperation({
    summary: 'Query executive command console',
    description:
      'Executive dashboard visibility is informational only and does not confer command authority.',
  })
  @ApiCreatedResponse({ description: 'Executive console query result with disclaimers' })
  queryExecutive(@CurrentActor() actor: AuthenticatedPrincipal, @Body() body: QueryDashboardDto) {
    this.boundaryService.rejectClientSuppliedActorIdentity(body as unknown as Record<string, unknown>);
    return this.queryService.queryExecutiveConsole({
      actor,
      dashboardDefinitionId: body.dashboardDefinitionId,
      institutionId: body.institutionId,
      departmentId: body.departmentId,
      purpose: body.purpose,
      sensitivityScope: body.sensitivityScope,
      securityClearanceLevel: body.securityClearanceLevel,
      caseAssignmentId: body.caseAssignmentId,
      filters: body.filters,
    });
  }

  @Post('departmental/query')
  @ApiOperation({
    summary: 'Query departmental intelligence console',
    description:
      'Departmental dashboard access is verified against authenticated actor entitlements for the requested scope.',
  })
  @ApiCreatedResponse({ description: 'Departmental console query result with disclaimers' })
  queryDepartmental(@CurrentActor() actor: AuthenticatedPrincipal, @Body() body: QueryDashboardDto) {
    this.boundaryService.rejectClientSuppliedActorIdentity(body as unknown as Record<string, unknown>);
    return this.queryService.queryDepartmentalConsole({
      actor,
      dashboardDefinitionId: body.dashboardDefinitionId,
      institutionId: body.institutionId,
      departmentId: body.departmentId,
      purpose: body.purpose,
      sensitivityScope: body.sensitivityScope,
      securityClearanceLevel: body.securityClearanceLevel,
      caseAssignmentId: body.caseAssignmentId,
      filters: body.filters,
    });
  }

  @Post('snapshots/capture')
  @ApiOperation({
    summary: 'Capture immutable dashboard snapshot',
    description: 'Snapshot capturer identity is derived from the authenticated session.',
  })
  @ApiCreatedResponse({ description: 'Immutable dashboard snapshot with replay token' })
  captureSnapshot(@CurrentActor() actor: AuthenticatedPrincipal, @Body() body: CaptureSnapshotDto) {
    this.boundaryService.rejectClientSuppliedActorIdentity(body as unknown as Record<string, unknown>);
    return this.snapshotService.captureSnapshot({
      actor,
      dashboardVersionId: body.dashboardVersionId,
      projectionIds: body.projectionIds,
    });
  }

  @Get('snapshots/replay/:replayToken')
  @ApiOperation({
    summary: 'Replay immutable dashboard snapshot',
    description: 'Replay requires authenticated actor with verified dashboard access entitlements.',
  })
  @ApiOkResponse({ description: 'Immutable snapshot payload for replay' })
  replaySnapshot(
    @CurrentActor() actor: AuthenticatedPrincipal,
    @Param('replayToken') replayToken: string,
  ) {
    return this.snapshotService.replaySnapshot(replayToken, actor);
  }
}
