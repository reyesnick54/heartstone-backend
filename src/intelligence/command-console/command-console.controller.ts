import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { DashboardBoundaryService } from './dashboard-boundary.service';
import { DashboardIndicatorProjectionService } from './dashboard-indicator-projection.service';
import { DashboardQueryService } from './dashboard-query.service';
import { DashboardSnapshotService } from './dashboard-snapshot.service';
import { DeriveIndicatorProjectionDto } from './dto/derive-indicator-projection.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@Controller('intelligence/command-console')
export class CommandConsoleController {
  constructor(
    private readonly boundaryService: DashboardBoundaryService,
    private readonly projectionService: DashboardIndicatorProjectionService,
    private readonly queryService: DashboardQueryService,
    private readonly snapshotService: DashboardSnapshotService,
  ) {}

  @Post('projections/derive')
  deriveProjection(@Body() body: DeriveIndicatorProjectionDto) {
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
      ownerIdentityId: body.ownerIdentityId,
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
  queryExecutive(@Body() body: QueryDashboardDto) {
    return this.queryService.queryExecutiveConsole(body);
  }

  @Post('departmental/query')
  queryDepartmental(@Body() body: QueryDashboardDto) {
    return this.queryService.queryDepartmentalConsole(body);
  }

  @Post('snapshots/capture')
  captureSnapshot(
    @Body()
    body: {
      dashboardVersionId: string;
      capturedByIdentityId: string;
      projectionIds: string[];
    },
  ) {
    return this.snapshotService.captureSnapshot(body);
  }

  @Get('snapshots/replay/:replayToken')
  replaySnapshot(@Param('replayToken') replayToken: string) {
    return this.snapshotService.replaySnapshot(replayToken);
  }
}
