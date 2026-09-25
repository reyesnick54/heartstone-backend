import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthorityEvaluationOutcome, IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { AuthorityEvaluationService } from '../evaluation/authority-evaluation.service';
import { type AuthorityEvaluationRequest } from '../evaluation/authority-evaluation.types';
import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';
import { InstitutionalActorResolver } from '../institutional-actor/institutional-actor-resolver.service';
import { type AuthorityPolicyMetadata } from '../policy/authority-policy.decorator';
import {
  type ConsequentialActionContext,
  type ConsequentialActionMetadata,
  FINAL_DECISION_ACTIONS,
} from './consequential-action.types';
import {
  readEvaluationResourceScope,
  readInstitutionalContext,
} from './consequential-action-context.util';
import { buildConsequentialActionDenial } from './consequential-action-denial.util';
import { validateInstitutionalResourceScope } from './consequential-action-resolvers';

@Injectable()
export class ConsequentialActionService {
  constructor(
    private readonly evaluationService: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly prisma: PrismaService,
  ) {}

  buildContext(
    session: SessionContextDto,
    request: ConsequentialActionContext['request'],
  ): ConsequentialActionContext {
    return {
      session,
      request,
      prisma: this.prisma,
      functionRecords: this.functionRecords,
    };
  }

  async evaluateConsequentialAction(
    session: SessionContextDto,
    metadata: ConsequentialActionMetadata,
    request: ConsequentialActionContext['request'],
  ): Promise<AuthorityEvaluationResponseDto> {
    const context = this.buildContext(session, request);
    const functionAuthorityRecordId = await this.resolveFunctionAuthorityRecordId(
      metadata,
      context,
    );

    const resourceScope = metadata.resourceResolver
      ? await metadata.resourceResolver(context)
      : null;

    const scopeValid = await validateInstitutionalResourceScope(
      functionAuthorityRecordId,
      resourceScope,
      this.prisma,
    );
    if (!scopeValid) {
      throw this.buildScopeDeniedException();
    }

    await this.assertHumanActorWhenRequired(session.identityId, metadata);

    const institutional = readInstitutionalContext(context, metadata.institutionalFieldPrefixes);
    const body = request.body ?? {};
    const resourceIdentifiers = readEvaluationResourceScope(body);

    const evaluationRequest: AuthorityEvaluationRequest = {
      identityId: session.identityId,
      functionAuthorityRecordId,
      action: metadata.action,
      officeholderId: institutional.officeholderId,
      officeId: institutional.officeId ?? resourceScope?.officeId,
      appointmentId: institutional.appointmentId,
      delegationId: institutional.delegationId,
      resourceScope: {
        caseId: resourceIdentifiers.caseId,
        evidencePacketVersionId: resourceIdentifiers.evidencePacketVersionId,
        decisionReadinessAssessmentId: resourceIdentifiers.decisionReadinessAssessmentId,
      },
      scopeValue: resourceIdentifiers.scopeValue ?? resourceScope?.scopeValue,
      transactionAmount: resourceIdentifiers.transactionAmount,
      externalDataAccessOnly: resourceIdentifiers.externalDataAccessOnly,
    };

    return this.evaluationService.evaluate(evaluationRequest);
  }

  async assertConsequentialActionAllowed(
    session: SessionContextDto,
    metadata: ConsequentialActionMetadata,
    request: ConsequentialActionContext['request'],
  ): Promise<AuthorityEvaluationResponseDto> {
    const result = await this.evaluateConsequentialAction(session, metadata, request);

    if (result.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(buildConsequentialActionDenial(result));
    }

    return result;
  }

  /** Backward-compatible adapter for legacy `@RequiresAuthority` metadata. */
  async assertLegacyPolicyAllowed(
    session: SessionContextDto,
    policy: AuthorityPolicyMetadata,
    request: ConsequentialActionContext['request'],
  ): Promise<AuthorityEvaluationResponseDto> {
    return this.assertConsequentialActionAllowed(
      session,
      {
        action: policy.action,
        functionAuthorityRecordId: policy.functionAuthorityRecordId,
        functionCode: policy.functionCode,
        functionResolver: policy.functionAuthorityRecordId
          ? undefined
          : policy.functionCode
            ? undefined
            : async (context) => {
                const instrumentTypeVersionId = context.request.body?.instrumentTypeVersionId;
                if (typeof instrumentTypeVersionId !== 'string') {
                  return null;
                }
                const typeVersion = await context.prisma.instrumentTypeVersion.findUnique({
                  where: { id: instrumentTypeVersionId },
                  select: { issuanceFunctionAuthorityRecordId: true },
                });
                return typeVersion?.issuanceFunctionAuthorityRecordId ?? null;
              },
      },
      request,
    );
  }

  private async resolveFunctionAuthorityRecordId(
    metadata: ConsequentialActionMetadata,
    context: ConsequentialActionContext,
  ): Promise<string> {
    if (metadata.functionAuthorityRecordId) {
      return metadata.functionAuthorityRecordId;
    }

    if (metadata.functionCode) {
      return (await this.functionRecords.findByCode(metadata.functionCode)).id;
    }

    if (metadata.functionResolver) {
      const resolved = await metadata.functionResolver(context);
      if (resolved) {
        return resolved;
      }
    }

    throw this.buildMisconfiguredException('No function authority mapping could be resolved');
  }

  private async assertHumanActorWhenRequired(
    identityId: string,
    metadata: ConsequentialActionMetadata,
  ): Promise<void> {
    const requireHuman = metadata.requireHumanActor ?? FINAL_DECISION_ACTIONS.has(metadata.action);

    if (!requireHuman) {
      return;
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { type: true },
    });

    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException(
        buildConsequentialActionDenial(
          {
            evaluationId: '',
            functionAuthorityRecordId: metadata.functionAuthorityRecordId ?? '',
            identityId,
            action: metadata.action,
            outcome: AuthorityEvaluationOutcome.DENY,
            status: 'NOT_AUTHORIZED' as never,
            explanationCodes: [
              identity?.type === IdentityType.SERVICE
                ? AUTHORITY_EVALUATION_EXPLANATION_CODES.SERVICE_IDENTITY_NOT_HUMAN
                : AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_DECIDE,
            ],
            summary: 'Final consequential actions require an authorized human institutional actor.',
            safeHalt: false,
            requiresRevalidation: false,
            evaluatedAt: new Date(),
          },
          'Consequential action blocked: human institutional actor required.',
        ),
      );
    }
  }

  private buildMisconfiguredException(detail: string): ForbiddenException {
    return new ForbiddenException({
      message: 'Consequential action guard is misconfigured.',
      detail,
    });
  }

  private buildScopeDeniedException(): ForbiddenException {
    return new ForbiddenException(
      buildConsequentialActionDenial(
        {
          evaluationId: '',
          functionAuthorityRecordId: '',
          identityId: '',
          action: 'APPROVE',
          outcome: AuthorityEvaluationOutcome.DENY,
          status: 'NOT_AUTHORIZED' as never,
          explanationCodes: [AUTHORITY_EVALUATION_EXPLANATION_CODES.SCOPE_LIMIT_EXCEEDED],
          summary: 'Institutional resource scope does not align with authority function context.',
          safeHalt: false,
          requiresRevalidation: false,
          evaluatedAt: new Date(),
        },
        'Consequential action blocked: institutional resource scope mismatch.',
      ),
    );
  }
}
