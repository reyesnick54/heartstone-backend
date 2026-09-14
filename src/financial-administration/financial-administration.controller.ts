import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { FinancialBoundaryService } from './common/financial-boundary.service';
import { CalculateFeeAssessmentDto } from './dto/calculate-fee-assessment.dto';
import { CreateFeeScheduleDto } from './dto/create-fee-schedule.dto';
import {
  ApproveFeeScheduleVersionDto,
  CreateFeeScheduleVersionDto,
} from './dto/create-fee-schedule-version.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FeeAssessmentService } from './fee-assessments/fee-assessment.service';
import { FeeScheduleService } from './fee-schedules/fee-schedule.service';
import { InvoiceService } from './invoices/invoice.service';

@ApiTags('financial')
@Controller('financial')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class FinancialAdministrationController {
  constructor(
    private readonly feeSchedules: FeeScheduleService,
    private readonly feeAssessments: FeeAssessmentService,
    private readonly invoices: InvoiceService,
    private readonly boundary: FinancialBoundaryService,
  ) {}

  @Post('fee-schedules')
  @ApiOperation({ summary: 'Create a fee schedule (administrative)' })
  async createFeeSchedule(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateFeeScheduleDto,
  ) {
    this.boundary.rejectClientProtectedFeeScheduleFields(dto as unknown as Record<string, unknown>);

    return this.feeSchedules.createSchedule({
      code: dto.code,
      name: dto.name,
      responsibleInstitutionId: dto.responsibleInstitutionId,
      responsibleDepartmentId: dto.responsibleDepartmentId,
      currency: dto.currency,
      actorIdentityId: session.identityId,
    });
  }

  @Post('fee-schedules/:id/versions')
  @ApiOperation({ summary: 'Create a fee schedule version with items' })
  async createFeeScheduleVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) feeScheduleId: string,
    @Body() dto: CreateFeeScheduleVersionDto,
  ) {
    this.boundary.rejectClientProtectedFeeScheduleFields(dto as unknown as Record<string, unknown>);

    return this.feeSchedules.createVersion({
      feeScheduleId,
      version: dto.version,
      governingSourceId: dto.governingSourceId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil,
      items: dto.items,
      actorIdentityId: session.identityId,
      officeholderId: dto.officeholderId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
    });
  }

  @Post('fee-schedules/:id/versions/:versionId/activate')
  @ApiOperation({ summary: 'Approve and activate a fee schedule version via authority evaluation' })
  async activateFeeScheduleVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: ApproveFeeScheduleVersionDto,
  ) {
    return this.feeSchedules.approveAndActivateVersion({
      feeScheduleVersionId: versionId,
      actorIdentityId: session.identityId,
      officeholderId: dto.officeholderId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
    });
  }

  @Get('fee-schedules')
  @ApiOperation({ summary: 'List fee schedules' })
  async listFeeSchedules() {
    return this.feeSchedules.listSchedules();
  }

  @Get('fee-schedules/:id')
  @ApiOperation({ summary: 'Get fee schedule with versions' })
  async getFeeSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.feeSchedules.getSchedule(id);
  }

  @Post('fee-assessments')
  @ApiOperation({ summary: 'Calculate fee assessment from active schedule version' })
  async calculateFeeAssessment(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CalculateFeeAssessmentDto,
  ) {
    this.boundary.rejectClientProtectedFeeAssessmentFields(
      dto as unknown as Record<string, unknown>,
    );

    return this.feeAssessments.calculateAssessment({
      feeScheduleVersionId: dto.feeScheduleVersionId,
      serviceId: dto.serviceId,
      serviceVersionId: dto.serviceVersionId,
      applicationId: dto.applicationId,
      caseId: dto.caseId,
      officialInstrumentId: dto.officialInstrumentId,
      complianceMatterId: dto.complianceMatterId,
      redressMatterId: dto.redressMatterId,
      masterAdministrativeFileId: dto.masterAdministrativeFileId,
      feeCodes: dto.feeCodes,
      quantities: dto.quantities,
      calculationInputs: dto.calculationInputs,
      calculatedByIdentityId: session.identityId,
    });
  }

  @Get('fee-assessments/:id')
  @ApiOperation({ summary: 'Get fee assessment by ID' })
  async getFeeAssessment(@Param('id', ParseUUIDPipe) id: string) {
    return this.feeAssessments.findById(id);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice from fee assessment' })
  async createInvoice(@CurrentSession() session: SessionContextDto, @Body() dto: CreateInvoiceDto) {
    this.boundary.rejectClientProtectedInvoiceFields(dto as unknown as Record<string, unknown>);

    return this.invoices.createInvoice({
      feeAssessmentId: dto.feeAssessmentId,
      institutionId: dto.institutionId,
      payerIdentityId: dto.payerIdentityId,
      organizationId: dto.organizationId,
      caseId: dto.caseId,
      masterAdministrativeFileId: dto.masterAdministrativeFileId,
      dueAt: dto.dueAt,
      actorIdentityId: session.identityId,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.findById(id);
  }
}
