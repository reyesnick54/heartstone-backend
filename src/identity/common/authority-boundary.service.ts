import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { AuthorityEvaluationStatus } from '../../authority/policy/authority-evaluation-status.enum';
import { deriveEvaluationStatus } from '../../authority/policy/derive-evaluation-status.util';

/**
 * Identity-side authority boundary facade.
 * Authentication and identity context alone never resolve government authority.
 * With a complete function/action evaluation request, delegates to AuthorityEvaluationService.
 */
export interface GovernmentAuthorityResolution {
  hasGovernmentAuthority: boolean;
  reason: string;
  evaluationStatus?: AuthorityEvaluationStatus;
  outcome?: AuthorityEvaluationOutcome;
  functionAuthorityRecordId?: string;
  action?: AuthorityActionType;
  evaluationId?: string;
}

export interface AuthorityContext {
  identityId?: string;
  userAccountId?: string;
  officeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
  organizationId?: string;
  representativeAuthorityId?: string;
  assuranceLevel?: string;
  externalClaims?: Record<string, unknown>;
  functionAuthorityRecordId?: string;
  action?: AuthorityActionType;
  officeId?: string;
}

@Injectable()
export class AuthorityBoundaryService {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolveGovernmentAuthority(context: AuthorityContext): GovernmentAuthorityResolution | null {
    if (!this.isEvaluationRequest(context)) {
      return null;
    }

    return {
      hasGovernmentAuthority: false,
      reason:
        'Use AuthorityEvaluationService.evaluate() for runtime authority resolution. Identity alone grants no authority.',
      functionAuthorityRecordId: context.functionAuthorityRecordId,
      action: context.action,
    };
  }

  async resolveGovernmentAuthorityAsync(
    context: AuthorityContext,
  ): Promise<GovernmentAuthorityResolution | null> {
    if (!this.isEvaluationRequest(context)) {
      return null;
    }

    const identityId = context.identityId;
    const functionAuthorityRecordId = context.functionAuthorityRecordId;
    const action = context.action;
    if (!identityId || !functionAuthorityRecordId || !action) {
      return null;
    }

    const evaluationService = this.getEvaluationService();
    if (!evaluationService) {
      return {
        hasGovernmentAuthority: false,
        reason: 'Authority evaluation engine is not available.',
        functionAuthorityRecordId,
        action,
      };
    }

    const result = await evaluationService.evaluate({
      identityId,
      functionAuthorityRecordId,
      action,
      officeholderId: context.officeholderId,
      officeId: context.officeId,
      appointmentId: context.appointmentId,
      delegationId: context.delegationId,
    });

    const status = deriveEvaluationStatus(result.outcome, result.explanationCodes);

    return {
      hasGovernmentAuthority: result.outcome === AuthorityEvaluationOutcome.ALLOW,
      reason: result.summary,
      evaluationStatus: status,
      outcome: result.outcome,
      functionAuthorityRecordId,
      action,
      evaluationId: result.evaluationId,
    };
  }

  assertNoGovernmentAuthorityFromAuthenticationOnly(context: AuthorityContext): void {
    const hasOnlyAuthContext =
      Boolean(context.identityId ?? context.userAccountId) &&
      !context.functionAuthorityRecordId &&
      !context.action;

    if (!hasOnlyAuthContext) {
      return;
    }

    const resolution = this.resolveGovernmentAuthority(context);
    if (resolution?.hasGovernmentAuthority) {
      throw new Error('Government authority must not be resolved from authentication alone');
    }
  }

  assertNoGovernmentAuthority(context: AuthorityContext): void {
    this.assertNoGovernmentAuthorityFromAuthenticationOnly(context);
  }

  private isEvaluationRequest(context: AuthorityContext): boolean {
    return Boolean(context.functionAuthorityRecordId && context.action && context.identityId);
  }

  private getEvaluationService(): AuthorityEvaluationService | undefined {
    try {
      return this.moduleRef.get(AuthorityEvaluationService, { strict: false });
    } catch {
      return undefined;
    }
  }
}
