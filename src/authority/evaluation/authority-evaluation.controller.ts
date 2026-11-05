import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { RouteAccess } from '../../security/decorators/route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { TechnicalPermissionEvaluationService } from '../../technical-access/services/technical-permission-evaluation.service';
import { AuthorityEvaluationService } from './authority-evaluation.service';
import { AuthorityEvaluationResponseDto } from './dto/authority-evaluation-response.dto';
import { EvaluateAuthorityDto } from './dto/evaluate-authority.dto';

@ApiTags('authority-evaluation')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Authority configuration or evaluated institutional action scope',
  authorityRequirement: 'Explicit function authority evaluation for consequential actions',
  actorSource: 'Session identity with officeholder linkage when evaluating authority',
  primarySecurityInvariant: 'Technical permission does not create legal authority',
})
@Controller('authority/evaluate')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class AuthorityEvaluationController {
  constructor(
    private readonly evaluationService: AuthorityEvaluationService,
    // Optional so AuthorityModule can be built alone in tests; absent means fail closed below.
    @Optional() private readonly permissions?: TechnicalPermissionEvaluationService,
  ) {}

  @RouteAccess({
    routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
    authenticationRequired: true,
    scopeRequirement: "The signed-in person's own offices, appointments and delegations",
    authorityRequirement: 'Evaluates authority; confers none',
    actorSource: 'Session identity only; evaluation is never run for another person',
    primarySecurityInvariant: 'Technical permission does not create legal authority',
  })
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
      resourceScope: {
        caseId: dto.caseId,
        evidencePacketVersionId: dto.evidencePacketVersionId,
        decisionReadinessAssessmentId: dto.decisionReadinessAssessmentId,
      },
      transactionAmount: dto.transactionAmount,
      scopeValue: dto.scopeValue,
      externalDataAccessOnly: dto.externalDataAccessOnly,
      attestationSource: dto.attestationSource,
    });
  }

  @RouteAccess({
    routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
    authenticationRequired: true,
    scopeRequirement: 'Own evaluation records; others require authority:evaluation:run',
    authorityRequirement: 'None; records are immutable evidence of past evaluations',
    actorSource: 'Session identity',
    primarySecurityInvariant: 'Evaluation records of other people are not visible by default',
  })
  @Get('records/:id')
  @ApiOperation({ summary: 'Retrieve an immutable authority evaluation record' })
  @ApiOkResponse()
  async getRecord(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const record = await this.evaluationService.getEvaluationRecord(id);
    if (record.identityId !== session.identityId) {
      const granted = this.permissions
        ? await this.permissions.resolveGrantedPermissions(session.identityId)
        : [];
      if (!granted.includes(PermissionCodes.AUTHORITY_EVALUATION_RUN)) {
        // Same response as a missing record, so ids of other people's evaluations don't leak.
        throw new NotFoundException(`AuthorityEvaluationRecord "${id}" was not found`);
      }
    }
    return record;
  }
}
