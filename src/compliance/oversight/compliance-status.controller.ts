import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { ComplianceDashboardService } from './compliance-dashboard.service';
import { ComplianceMonitoringService } from './compliance-monitoring.service';
import { ComplianceProjectionService } from './compliance-projection.service';
import { ComplianceRevalidationService } from './compliance-revalidation.service';
import { ComplianceStatusBoundaryService } from './compliance-status-boundary.service';
import { DeriveComplianceProjectionDto } from './dto/derive-compliance-projection.dto';
import { EvaluateMonitoringRuleDto } from './dto/evaluate-monitoring-rule.dto';
import { RecordRevalidationDto } from './dto/record-revalidation.dto';

@Controller('compliance/status')
export class ComplianceStatusController {
  constructor(
    private readonly projectionService: ComplianceProjectionService,
    private readonly dashboardService: ComplianceDashboardService,
    private readonly monitoringService: ComplianceMonitoringService,
    private readonly revalidationService: ComplianceRevalidationService,
    private readonly boundaryService: ComplianceStatusBoundaryService,
  ) {}

  @Post('projections/derive')
  deriveProjection(@Body() body: DeriveComplianceProjectionDto) {
    this.boundaryService.assertClientCannotSetComplianceStatus(
      body as unknown as Record<string, unknown>,
    );
    return this.projectionService.deriveProjection({
      audience: body.audience,
      subjectIdentityId: body.subjectIdentityId,
      subjectOfficeholderId: body.subjectOfficeholderId,
      subjectDepartmentId: body.subjectDepartmentId,
      subjectInstitutionId: body.subjectInstitutionId,
      caseId: body.caseId,
      masterAdministrativeFileId: body.masterAdministrativeFileId,
      officialInstrumentId: body.officialInstrumentId,
      functionAuthorityRecordId: body.functionAuthorityRecordId,
      authorityEvaluationRecordId: body.authorityEvaluationRecordId,
      underlyingAssessmentType: body.underlyingAssessmentType,
      underlyingAssessmentId: body.underlyingAssessmentId,
      evidenceCutoffAt: body.evidenceCutoffAt ? new Date(body.evidenceCutoffAt) : undefined,
    });
  }

  @Get('dashboards/holder/:identityId')
  async getHolderDashboard(
    @Param('identityId') identityId: string,
    @Query('caseId') caseId?: string,
  ) {
    const dashboard = await this.dashboardService.getHolderDashboard(identityId, caseId);
    return this.boundaryService.sanitizeHolderDashboardResponse(dashboard);
  }

  @Get('dashboards/official/:officeholderId')
  getOfficialDashboard(
    @Param('officeholderId') officeholderId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.dashboardService.getOfficialDashboard(officeholderId, departmentId);
  }

  @Get('dashboards/executive/:institutionId')
  getExecutiveDashboard(@Param('institutionId') institutionId: string) {
    return this.dashboardService.getExecutiveAggregate(institutionId);
  }

  @Get('projections/:projectionId')
  getProjection(@Param('projectionId') projectionId: string) {
    return this.dashboardService.getProjectionById(projectionId);
  }

  @Post('monitoring/rules/evaluate')
  evaluateRule(@Body() body: EvaluateMonitoringRuleDto) {
    return this.monitoringService.evaluateRule(body);
  }

  @Post('revalidation')
  recordRevalidation(@Body() body: RecordRevalidationDto) {
    return this.revalidationService.recordRevalidation(body);
  }
}
