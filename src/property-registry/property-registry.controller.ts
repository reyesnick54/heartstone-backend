import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { PropertyRegistryCorrectionService } from './corrections/property-registry-correction.service';
import { CreatePropertyTransferIntakeDto } from './dto/create-property-transfer-intake.dto';
import { SubmitPropertyCorrectionRequestDto } from './dto/submit-property-correction-request.dto';
import { PropertyTransferIntakeService } from './intake/property-transfer-intake.service';
import {
  PROPERTY_REGISTRY_API_TAG,
  PROPERTY_REGISTRY_AUTHORITY_FUNCTION_CODES,
} from './property-registry.constants';
import { PropertyRegistryReadService } from './queries/property-registry-read.service';
import { PropertyTitleRegistrationService } from './registration/property-title-registration.service';

@ApiTags(PROPERTY_REGISTRY_API_TAG)
@Controller('property-registry')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class PropertyRegistryController {
  constructor(
    private readonly intake: PropertyTransferIntakeService,
    private readonly corrections: PropertyRegistryCorrectionService,
    private readonly reads: PropertyRegistryReadService,
    private readonly titleRegistration: PropertyTitleRegistrationService,
  ) {}

  @Post('transfers/intake')
  @ApiOperation({
    summary:
      'Initiate property transfer intake (non-official; supports application/case workflow only)',
  })
  async createTransferIntake(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreatePropertyTransferIntakeDto,
  ) {
    return this.intake.createIntake(session.identityId, dto);
  }

  @Post('correction-requests')
  @ApiOperation({ summary: 'Submit a title/property correction request (not an approval)' })
  async submitCorrection(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: SubmitPropertyCorrectionRequestDto,
  ) {
    return this.corrections.submitRequest(session.identityId, dto);
  }

  @Get('entries/:entryId')
  @ApiOperation({ summary: 'Read property registry entry subject to access classification' })
  async getEntry(
    @CurrentSession() session: SessionContextDto,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.reads.getEntryForActor(session.identityId, entryId);
  }

  @Get('parcels/:parcelId/titles/:titleId/distinction')
  @ApiOperation({ summary: 'Confirm parcel and title are distinct linked concepts' })
  async parcelTitleDistinction(
    @Param('parcelId', ParseUUIDPipe) parcelId: string,
    @Param('titleId', ParseUUIDPipe) titleId: string,
  ) {
    return this.reads.assertParcelDistinctFromTitle(parcelId, titleId);
  }

  @Post('transfers/:transferId/register-title')
  @UseGuards(ConsequentialActionGuard)
  @ConsequentialAction({
    action: AuthorityActionType.APPROVE,
    functionCode: PROPERTY_REGISTRY_AUTHORITY_FUNCTION_CODES.TITLE_REGISTER,
  })
  @ApiOperation({
    summary:
      'Record official title registry mutation after authority and decision (not client-direct)',
  })
  async registerTitle(
    @CurrentSession() session: SessionContextDto,
    @Param('transferId', ParseUUIDPipe) transferId: string,
    @Body()
    body: {
      caseId: string;
      jurisdictionId: string;
      institutionId: string;
      governmentDecisionId: string;
      authorityEvaluationRecordId: string;
      registrarOfficeholderId: string;
      titlePayloadSnapshot: Record<string, unknown>;
    },
  ) {
    return this.titleRegistration.recordOfficialTitleRegistration(session.identityId, {
      propertyTransferId: transferId,
      registrarIdentityId: session.identityId,
      ...body,
    });
  }
}
