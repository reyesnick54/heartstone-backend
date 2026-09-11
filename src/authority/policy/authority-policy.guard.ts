import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorityEvaluationOutcome } from '@prisma/client';

import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { AuthorityEvaluationService } from '../evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';
import {
  AUTHORITY_POLICY_KEY,
  type AuthorityPolicyMetadata,
} from './authority-policy.decorator';

@Injectable()
export class AuthorityPolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly evaluationService: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<AuthorityPolicyMetadata | undefined>(
      AUTHORITY_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      session?: SessionContextDto;
      authorityEvaluation?: unknown;
      body?: Record<string, unknown>;
    }>();

    const session = request.session;
    if (!session) {
      throw new ForbiddenException('Authenticated session required for authority evaluation');
    }

    const functionAuthorityRecordId = await this.resolveFunctionId(policy);
    const body = request.body ?? {};

    const result = await this.evaluationService.evaluate({
      identityId: session.identityId,
      functionAuthorityRecordId,
      action: policy.action,
      officeholderId: body.officeholderId as string | undefined,
      officeId: body.officeId as string | undefined,
      appointmentId: body.appointmentId as string | undefined,
      delegationId: body.delegationId as string | undefined,
      evidenceProvided: body.evidenceProvided as string[] | undefined,
      qualificationCodes: body.qualificationCodes as string[] | undefined,
      transactionAmount: body.transactionAmount as number | undefined,
      scopeValue: body.scopeValue as string | undefined,
      hasSecondApproval: body.hasSecondApproval as boolean | undefined,
      hasConsultation: body.hasConsultation as boolean | undefined,
      hasSupervision: body.hasSupervision as boolean | undefined,
      hasLiaison: body.hasLiaison as boolean | undefined,
      isSelfApproval: body.isSelfApproval as boolean | undefined,
      isConflicted: body.isConflicted as boolean | undefined,
      isRecused: body.isRecused as boolean | undefined,
      priorActions: body.priorActions as never,
      externalDataAccessOnly: body.externalDataAccessOnly as boolean | undefined,
    });

    request.authorityEvaluation = result;

    if (result.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException({
        message: 'Authority evaluation did not permit this action.',
        evaluation: result,
      });
    }

    return true;
  }

  private async resolveFunctionId(policy: AuthorityPolicyMetadata): Promise<string> {
    if (policy.functionAuthorityRecordId) {
      return policy.functionAuthorityRecordId;
    }

    if (policy.functionCode) {
      const record = await this.functionRecords.findByCode(policy.functionCode);
      return record.id;
    }

    throw new ForbiddenException('Authority policy is misconfigured');
  }
}
