import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { AuthorityEvaluationService } from './authority-evaluation.service';
import { AuthorityEvaluationResponseDto } from './dto/authority-evaluation-response.dto';
import { EvaluateAuthorityDto } from './dto/evaluate-authority.dto';

@ApiTags('authority-evaluation')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Authority configuration or evaluated institutional action scope",
  authorityRequirement: "Explicit function authority evaluation for consequential actions",
  actorSource: "Session identity with officeholder linkage when evaluating authority",
  primarySecurityInvariant: "Technical permission does not create legal authority",
})
@Controller('authority/evaluate')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class AuthorityEvaluationController {
  constructor(private readonly evaluationService: AuthorityEvaluationService) {}

  @Post()
  @ApiOperation({
    summary: 'Evaluate whether a specific institutional action may proceed',
    description:
      'Server computes authority. Client-supplied authorization claims are never accepted.',
  })
  @ApiCreatedResponse({ type: AuthorityEvaluationResponseDto })
  evaluate(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: EvaluateAuthorityDto,
  ): Promise<AuthorityEvaluationResponseDto> {
    return this.evaluationService.evaluate({
      identityId: session.identityId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      action: dto.action,
      officeholderId: dto.officeholderId,
      officeId: dto.officeId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      evidenceProvided: dto.evidenceProvided,
      qualificationCodes: dto.qualificationCodes,
      transactionAmount: dto.transactionAmount,
      scopeValue: dto.scopeValue,
      hasSecondApproval: dto.hasSecondApproval,
      hasConsultation: dto.hasConsultation,
      hasSupervision: dto.hasSupervision,
      hasLiaison: dto.hasLiaison,
      isSelfApproval: dto.isSelfApproval,
      isConflicted: dto.isConflicted,
      isRecused: dto.isRecused,
      priorActions: dto.priorActions,
      externalDataAccessOnly: dto.externalDataAccessOnly,
      attestationSource: dto.attestationSource,
    });
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Retrieve an immutable authority evaluation record' })
  @ApiOkResponse()
  getRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluationService.getEvaluationRecord(id);
  }
}
