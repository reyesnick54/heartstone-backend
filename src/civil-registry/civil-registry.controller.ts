import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
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
import { CivilRegistryCertificateService } from './certificates/civil-registry-certificate.service';
import { CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES } from './civil-registry.constants';
import { CivilRegistryRegistrationService } from './registration/civil-registry-registration.service';

const CIVIL_REGISTRY_API_TAG = 'civil-registry';

@ApiTags(CIVIL_REGISTRY_API_TAG)
@ApiBearerAuth()
@Controller('civil-registry')
@UseGuards(SessionAuthGuard)
export class CivilRegistryController {
  constructor(
    private readonly registrationService: CivilRegistryRegistrationService,
    private readonly certificateService: CivilRegistryCertificateService,
  ) {}

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
    return this.registrationService.createEventSubmission(body);
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
    return this.registrationService.registerOfficialEvent({
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
    return this.registrationService.approveCorrection({
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
    return this.certificateService.requestCertificate({
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
    return this.certificateService.issueCertificate({
      certificateId,
      officialIdentityId: session.identityId,
      issuerInstitutionId: body.issuerInstitutionId,
      officialInstrumentId: body.officialInstrumentId,
    });
  }
}
