import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../../authority/consequential-action/consequential-action.guard';
import { resolveFunctionFromInstrumentTypeVersion } from '../../authority/consequential-action/consequential-action-resolvers';
import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { AssessIssuanceReadinessDto } from '../issuance/dto/assess-issuance-readiness.dto';
import { IssueOfficialInstrumentDto } from '../issuance/dto/issue-official-instrument.dto';
import { IssuanceService } from '../issuance/issuance.service';
import { IssuanceReadinessService } from '../issuance/issuance-readiness.service';

@ApiTags('Official Instrument Issuance')
@Controller('decisions-issuance')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
export class IssuanceController {
  constructor(
    private readonly issuanceService: IssuanceService,
    private readonly readinessService: IssuanceReadinessService,
  ) {}

  @Post('readiness/assess')
  @ConsequentialAction({
    action: AuthorityActionType.ISSUE,
    functionResolver: resolveFunctionFromInstrumentTypeVersion,
    institutionalFieldPrefixes: ['issuer'],
  })
  @ApiCreatedResponse({ description: 'Issuance readiness assessment recorded' })
  assessReadiness(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: AssessIssuanceReadinessDto,
  ) {
    return this.readinessService.assess({
      governmentDecisionId: dto.governmentDecisionId,
      instrumentTypeVersionId: dto.instrumentTypeVersionId,
      caseId: dto.caseId,
      issuerOfficeholderId: dto.issuerOfficeholderId,
      issuerOfficeId: dto.issuerOfficeId,
      issuerAppointmentId: dto.issuerAppointmentId,
      issuerDelegationId: dto.issuerDelegationId,
      holderIdentityId: dto.holderIdentityId,
      holderOrganizationId: dto.holderOrganizationId,
      scope: dto.scope,
      issuerIdentityId: session.identityId,
      assessedByIdentityId: session.identityId,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      signatureDocumentVersionId: dto.signatureDocumentVersionId,
      sealDocumentVersionId: dto.sealDocumentVersionId,
      issuerSource: dto.issuerSource,
      externalIssuerReference: dto.externalIssuerReference,
    });
  }

  @Post('issue')
  @ConsequentialAction({
    action: AuthorityActionType.ISSUE,
    functionResolver: resolveFunctionFromInstrumentTypeVersion,
    institutionalFieldPrefixes: ['issuer'],
  })
  @ApiCreatedResponse({ description: 'Official instrument issued' })
  issue(@CurrentSession() session: SessionContextDto, @Body() dto: IssueOfficialInstrumentDto) {
    return this.issuanceService.issue({
      governmentDecisionId: dto.governmentDecisionId,
      instrumentTypeVersionId: dto.instrumentTypeVersionId,
      caseId: dto.caseId,
      issuerOfficeholderId: dto.issuerOfficeholderId,
      issuerOfficeId: dto.issuerOfficeId,
      issuerAppointmentId: dto.issuerAppointmentId,
      issuerDelegationId: dto.issuerDelegationId,
      holderIdentityId: dto.holderIdentityId,
      holderOrganizationId: dto.holderOrganizationId,
      scope: dto.scope,
      issuerIdentityId: session.identityId,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      signatureDocumentVersionId: dto.signatureDocumentVersionId,
      sealDocumentVersionId: dto.sealDocumentVersionId,
      issuerSource: dto.issuerSource,
      externalIssuerReference: dto.externalIssuerReference,
      idempotencyKey: dto.idempotencyKey,
      controlledFields: dto.controlledFields,
      computedFields: dto.computedFields,
      freeFormFields: dto.freeFormFields,
    });
  }
}
