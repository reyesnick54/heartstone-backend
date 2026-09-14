import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportClassification } from '@prisma/client';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { EvidenceDashboardTraceService } from './evidence-dashboard-trace.service';
import { ReportCorrectionService } from './report-correction.service';
import { ReportGenerationService } from './report-generation.service';
import { ReportPublicationService } from './report-publication.service';

@ApiTags('intelligence-analytics-reporting')
@Controller('intelligence-analytics/reporting')
@UseGuards(SessionAuthGuard)
export class ReportingController {
  constructor(
    private readonly generationService: ReportGenerationService,
    private readonly publicationService: ReportPublicationService,
    private readonly correctionService: ReportCorrectionService,
    private readonly traceService: EvidenceDashboardTraceService,
  ) {}

  @Post('runs')
  createRun(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      reportDefinitionVersionId: string;
      dataCutoffAt: string;
      metricCalculationRunIds: string[];
      institutionalMetricClaimIds: string[];
      reportingDashboardIndicatorIds?: string[];
      reportingDashboardSnapshotIds?: string[];
      evidencePacketVersionIds?: string[];
      frozenContent: Record<string, unknown>;
    },
  ) {
    return this.generationService.createRun({
      reportDefinitionVersionId: body.reportDefinitionVersionId,
      initiatedByIdentityId: session.identityId,
      dataCutoffAt: new Date(body.dataCutoffAt),
      metricCalculationRunIds: body.metricCalculationRunIds,
      institutionalMetricClaimIds: body.institutionalMetricClaimIds,
      reportingDashboardIndicatorIds: body.reportingDashboardIndicatorIds,
      reportingDashboardSnapshotIds: body.reportingDashboardSnapshotIds,
      evidencePacketVersionIds: body.evidencePacketVersionIds,
      frozenContent: body.frozenContent,
    });
  }

  @Post('publications')
  publish(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      reportGenerationRunId: string;
      authorityEvaluationRecordId: string;
      classification: ReportClassification;
      publisherOfficeholderId?: string;
      publicationReference?: string;
    },
  ) {
    return this.publicationService.publish({
      reportGenerationRunId: body.reportGenerationRunId,
      publisherIdentityId: session.identityId,
      publisherOfficeholderId: body.publisherOfficeholderId,
      authorityEvaluationRecordId: body.authorityEvaluationRecordId,
      classification: body.classification,
      publicationReference: body.publicationReference,
    });
  }

  @Post('corrections')
  correct(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      reportPublicationId: string;
      correctedContent: Record<string, unknown>;
      reason: string;
      correctedByOfficeholderId?: string;
      authorityEvaluationRecordId?: string;
      affectedReportClaimIds?: string[];
      sendNotification?: boolean;
    },
  ) {
    return this.correctionService.createCorrection({
      reportPublicationId: body.reportPublicationId,
      correctedContent: body.correctedContent,
      reason: body.reason,
      correctedByIdentityId: session.identityId,
      correctedByOfficeholderId: body.correctedByOfficeholderId,
      authorityEvaluationRecordId: body.authorityEvaluationRecordId,
      affectedReportClaimIds: body.affectedReportClaimIds,
      sendNotification: body.sendNotification,
    });
  }

  @Get('publications/:publicationId/content')
  getPublishedContent(@Param('publicationId') publicationId: string) {
    return this.generationService.getImmutablePublishedContent(publicationId);
  }

  @Get('claims/:reportClaimId/trace')
  getClaimTrace(@Param('reportClaimId') reportClaimId: string) {
    return this.traceService.buildFullTraceChain(reportClaimId);
  }
}
