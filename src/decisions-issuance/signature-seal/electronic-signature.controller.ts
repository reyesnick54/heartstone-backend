import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CreateSignatureAuthorizationDto } from './dto/create-signature-authorization.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { ElectronicSignatureAuthorizationService } from './electronic-signature-authorization.service';
import { ElectronicSignatureValidationService } from './electronic-signature-validation.service';
import { ElectronicSigningService } from './electronic-signing.service';

@ApiTags('decisions-issuance-signature')
@Controller('decisions-issuance/signature')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ElectronicSignatureController {
  constructor(
    private readonly authorizationService: ElectronicSignatureAuthorizationService,
    private readonly signingService: ElectronicSigningService,
    private readonly validationService: ElectronicSignatureValidationService,
  ) {}

  @Post('authorizations')
  @ApiOperation({ summary: 'Create electronic signature authorization' })
  createAuthorization(@Body() dto: CreateSignatureAuthorizationDto) {
    return this.authorizationService.createAuthorization({
      signatoryIdentityId: dto.signatoryIdentityId,
      officeholderId: dto.officeholderId,
      institutionId: dto.institutionId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      permittedInstrumentTypes: dto.permittedInstrumentTypes,
      permittedDecisionTypeVersion: dto.permittedDecisionTypeVersion,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      requiredIdentityAssuranceLevel: dto.requiredIdentityAssuranceLevel,
      requiresMfaAtSigning: dto.requiresMfaAtSigning,
      credentialReferenceId: dto.credentialReferenceId,
    });
  }

  @Post('sign')
  @ApiOperation({ summary: 'Apply controlled electronic signature to document version' })
  signDocument(@CurrentSession() session: SessionContextDto, @Body() dto: SignDocumentDto) {
    return this.signingService.signDocument({
      identityId: session.identityId,
      assuranceLevel: session.assuranceLevel,
      officeholderId: dto.officeholderId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      documentVersionId: dto.documentVersionId,
      documentHash: dto.documentHash,
      instrumentType: dto.instrumentType,
      intentStatement: dto.intentStatement,
      mfaVerified: dto.mfaVerified,
    });
  }

  @Get('records/:id/validate')
  @ApiOperation({ summary: 'Validate electronic signature record' })
  validateSignature(@Param('id') id: string) {
    return this.validationService.validateSignatureRecord(id);
  }
}
