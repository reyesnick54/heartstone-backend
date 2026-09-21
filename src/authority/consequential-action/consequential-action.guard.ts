import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { CONSEQUENTIAL_ACTION_KEY } from './consequential-action.decorator';
import { ConsequentialActionService } from './consequential-action.service';
import { type ConsequentialActionMetadata } from './consequential-action.types';

export const AUTHORITY_EVALUATION_REQUEST_KEY = 'authorityEvaluation';
export const CONSEQUENTIAL_ACTION_EVALUATION_KEY = 'consequentialActionEvaluation';

@Injectable()
export class ConsequentialActionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly consequentialActionService: ConsequentialActionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<ConsequentialActionMetadata | undefined>(
      CONSEQUENTIAL_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      session?: SessionContextDto;
      body?: Record<string, unknown>;
      params?: Record<string, string>;
      query?: Record<string, string>;
      [AUTHORITY_EVALUATION_REQUEST_KEY]?: AuthorityEvaluationResponseDto;
      [CONSEQUENTIAL_ACTION_EVALUATION_KEY]?: AuthorityEvaluationResponseDto;
    }>();

    const session = request.session;
    if (!session) {
      throw new ForbiddenException(
        'Authenticated session required for consequential action evaluation',
      );
    }

    const evaluation = await this.consequentialActionService.assertConsequentialActionAllowed(
      session,
      metadata,
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
