import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthorityActionType,
  CivilRegistryCertificateType,
  CivilRegistryEventType,
} from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CivilRegistryVitalRecordCertificateService } from './certificates/civil-registry-vital-record-certificate.service';
import {
  CIVIL_REGISTRY_API_TAG,
  CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES,
} from './civil-registry.constants';
import { CivilRecordCorrectionService } from './corrections/civil-record-correction.service';
import { CreateVitalEventIntakeDto } from './dto/create-vital-event-intake.dto';
import { SubmitCorrectionRequestDto } from './dto/submit-correction-request.dto';
import { VitalEventIntakeService } from './intake/vital-event-intake.service';
import { CivilRegistryReadService } from './queries/civil-registry-read.service';
import { CivilRegistryVitalRecordRegistrationService } from './registration/civil-registry-vital-record-registration.service';

@ApiTags(CIVIL_REGISTRY_API_TAG)
@Controller('civil-registry')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CivilRegistryController {
  constructor(
    private readonly intake: VitalEventIntakeService,
    private readonly corrections: CivilRecordCorrectionService,
    private readonly reads: CivilRegistryReadService,
    private readonly vitalRecordRegistration: CivilRegistryVitalRecordRegistrationService,
    private readonly vitalRecordCertificates: CivilRegistryVitalRecordCertificateService,
  ) {}

  @Post('vital-events/intake')
  @ApiOperation({
    summary:
      'Initiate vital event intake (non-official; opens or supports application/case workflow)',
  })
  async createIntake(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateVitalEventIntakeDto,
  ) {
    return this.intake.createIntake(session.identityId, {
      eventType: dto.eventType,
      jurisdictionId: dto.jurisdictionId,
      institutionId: dto.institutionId,
      applicationId: dto.applicationId,
      caseId: dto.caseId,
      governmentServiceId: dto.governmentServiceId,
      governingServicePackVersionId: dto.governingServicePackVersionId,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
      locationReference: dto.locationReference,
      primarySubjectCivilPersonRecordId: dto.primarySubjectCivilPersonRecordId,
    });
  }

  @Post('correction-requests')
  @ApiOperation({
    summary: 'Submit a civil record correction request (not an approval or amendment)',
  })
  async submitCorrection(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: SubmitCorrectionRequestDto,
  ) {
    return this.corrections.submitRequest(session.identityId, dto);
  }

  @Get('entries/:entryId')
  @ApiOperation({ summary: 'Read civil registry entry subject to access classification policy' })
  async getEntry(
    @CurrentSession() session: SessionContextDto,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.reads.getEntryForActor(session.identityId, entryId);
  }

  @Post('submissions')
  @ApiOperation({
    summary: 'Record a vital event submission (non-official until registration decision)',
  })
  createSubmission(
    @Body()
    body: {
      caseId: string;
      applicationId: string;
      eventType: CivilRegistryEventType;
      institutionId: string;
      subjectIdentityId?: string;
      summaryLabel?: string;
    },
  ) {
    return this.vitalRecordRegistration.createEventSubmission(body);
  }

  @Post('records/:id/register')
  @UseGuards(ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.VERIFY,
    functionCode: CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES.EVENT_REGISTER,
  })
  @ApiOperation({ summary: 'Register an official vital event (consequential)' })
  registerOfficial(
    @Param('id', ParseUUIDPipe) vitalRecordId: string,
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      summaryLabel: string;
      recordStatePayload: Record<string, unknown>;
    },
  ) {
    return this.vitalRecordRegistration.registerOfficialEvent({
      vitalRecordId,
      officialIdentityId: session.identityId,
      summaryLabel: body.summaryLabel,
      recordStatePayload: body.recordStatePayload,
    });
  }

  @Post('records/:id/corrections/approve')
  @UseGuards(ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.APPROVE,
    functionCode: CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES.CORRECTION_APPROVE,
  })
  @ApiOperation({ summary: 'Approve a civil record correction (preserves prior version)' })
  approveCorrection(
    @Param('id', ParseUUIDPipe) vitalRecordId: string,
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      amendmentReason: string;
      summaryLabel: string;
      correctedStatePayload: Record<string, unknown>;
    },
  ) {
    return this.vitalRecordRegistration.approveCorrection({
      vitalRecordId,
      officialIdentityId: session.identityId,
      amendmentReason: body.amendmentReason,
      summaryLabel: body.summaryLabel,
      correctedStatePayload: body.correctedStatePayload,
    });
  }

  @Post('certificates/request')
  @ApiOperation({
    summary: 'Request a civil certificate against an entitled official record',
  })
  requestCertificate(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      vitalRecordId: string;
      certificateType: CivilRegistryCertificateType;
      requestApplicationId?: string;
      issuanceCaseId?: string;
    },
  ) {
    return this.vitalRecordCertificates.requestCertificate({
      identityId: session.identityId,
      ...body,
    });
  }

  @Post('certificates/:id/issue')
  @UseGuards(ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.ISSUE,
    functionCode: CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES.CERTIFICATE_ISSUE,
  })
  @ApiOperation({ summary: 'Issue an authoritative civil certificate extract (consequential)' })
  issueCertificate(
    @Param('id', ParseUUIDPipe) certificateId: string,
    @CurrentSession() session: SessionContextDto,
    @Body() body: { issuerInstitutionId: string; officialInstrumentId?: string },
  ) {
    return this.vitalRecordCertificates.issueCertificate({
      certificateId,
      officialIdentityId: session.identityId,
      issuerInstitutionId: body.issuerInstitutionId,
      officialInstrumentId: body.officialInstrumentId,
    });
  }
}
