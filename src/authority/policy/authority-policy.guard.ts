import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import {
  AUTHORITY_EVALUATION_REQUEST_KEY,
  CONSEQUENTIAL_ACTION_EVALUATION_KEY,
} from '../consequential-action/consequential-action.guard';
import { ConsequentialActionService } from '../consequential-action/consequential-action.service';
import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { AUTHORITY_POLICY_KEY, type AuthorityPolicyMetadata } from './authority-policy.decorator';

/** Backward-compatible adapter; prefer {@link ConsequentialActionGuard} for new routes. */
@Injectable()
export class AuthorityPolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly consequentialActionService: ConsequentialActionService,
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
      body?: Record<string, unknown>;
      params?: Record<string, string>;
      query?: Record<string, string>;
      [AUTHORITY_EVALUATION_REQUEST_KEY]?: AuthorityEvaluationResponseDto;
      [CONSEQUENTIAL_ACTION_EVALUATION_KEY]?: AuthorityEvaluationResponseDto;
    }>();

    const session = request.session;
    if (!session) {
      throw new ForbiddenException('Authenticated session required for authority evaluation');
    }

    const evaluation = await this.consequentialActionService.assertLegacyPolicyAllowed(
      session,
      policy,
      {
        body: request.body,
        params: request.params,
        query: request.query,
      },
    );

    request[AUTHORITY_EVALUATION_REQUEST_KEY] = evaluation;
    request[CONSEQUENTIAL_ACTION_EVALUATION_KEY] = evaluation;

    return true;
  }
}
