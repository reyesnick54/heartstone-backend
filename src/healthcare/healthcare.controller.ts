import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type ActorContext } from '../identity/auth/context/actor-context.types';
import { CurrentActor } from '../identity/auth/decorators/current-actor.decorator';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { HealthcareConsentService } from './consent/healthcare-consent.service';
import { HealthDataRegistryService } from './data-registry/health-data-registry.service';
import { HEALTHCARE_API_TAG } from './healthcare.constants';
import { HealthcareInteropGatewayService } from './integrations/healthcare-interop-gateway.service';
import { HealthcarePatientReferenceService } from './patient/healthcare-patient-reference.service';
import { ResearchDataGovernanceService } from './research/research-data-governance.service';
import { ClinicalSafetyService } from './safety/clinical-safety.service';

@ApiTags(HEALTHCARE_API_TAG)
@Controller('api/v1/healthcare')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class HealthcareController {
  constructor(
    private readonly patients: HealthcarePatientReferenceService,
    private readonly consent: HealthcareConsentService,
    private readonly registry: HealthDataRegistryService,
    private readonly research: ResearchDataGovernanceService,
    private readonly safety: ClinicalSafetyService,
    private readonly interop: HealthcareInteropGatewayService,
  ) {}

  @Post('patients/references')
  @ApiOperation({ summary: 'Register a healthcare patient reference (not proof of authorization)' })
  ensurePatient(
    @Body() body: Parameters<HealthcarePatientReferenceService['ensurePatientReference']>[0],
  ) {
    return this.patients.ensurePatientReference(body);
  }

  @Post('consents/grants')
  @ApiOperation({ summary: 'Create versioned consent and purpose-bound grant' })
  createConsentGrant(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<HealthcareConsentService['createConsentAndGrant']>[1],
  ) {
    return this.consent.createConsentAndGrant(actor, body);
  }

  @Post('consents/grants/:grantId/withdraw')
  @ApiOperation({ summary: 'Withdraw consent grant while preserving historical records' })
  withdrawGrant(
    @CurrentActor() actor: ActorContext,
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Body() body: { reasonSummary?: string },
  ) {
    return this.consent.withdrawConsentGrant(actor, grantId, body.reasonSummary);
  }

  @Post('data-registry/records/:recordId/read')
  @ApiOperation({ summary: 'Read health data registry reference under access policy' })
  readRecord(
    @CurrentActor() actor: ActorContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body()
    body: {
      purposeCode: string;
      consentPurposeCode?: string;
      roleMarker?: string;
    },
  ) {
    return this.registry.readRecordForActor(actor, recordId, body);
  }

  @Get('research/access-grants/:grantId/records')
  @ApiOperation({ summary: 'List minimum-necessary dataset records for approved researcher' })
  listResearchRecords(
    @CurrentActor() actor: ActorContext,
    @Param('grantId', ParseUUIDPipe) grantId: string,
  ) {
    return this.research.listDatasetRecordsForResearcher(actor, grantId);
  }

  @Post('safety/adverse-events/reports')
  @ApiOperation({ summary: 'File adverse event report (does not establish causality)' })
  fileAdverseEvent(@Body() body: Parameters<ClinicalSafetyService['fileAdverseEventReport']>[0]) {
    return this.safety.fileAdverseEventReport(body);
  }

  @Post('integrations/exchanges/failed')
  @ApiOperation({ summary: 'Record failed healthcare integration exchange' })
  recordFailedExchange(
    @Body() body: Parameters<HealthcareInteropGatewayService['recordFailedClinicalExchange']>[0],
  ) {
    return this.interop.recordFailedClinicalExchange(body);
  }
}
