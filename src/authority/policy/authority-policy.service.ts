import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthorityEvaluationOutcome } from '@prisma/client';

import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { ConsequentialActionService } from '../consequential-action/consequential-action.service';
import { buildConsequentialActionDenial } from '../consequential-action/consequential-action-denial.util';
import { type AuthorityEvaluationRequest } from '../evaluation/authority-evaluation.types';
import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { type AuthorityPolicyMetadata } from './authority-policy.decorator';

@Injectable()
export class AuthorityPolicyService {
  constructor(private readonly consequentialActionService: ConsequentialActionService) {}

  async assertAuthorized(
    session: SessionContextDto,
    policy: AuthorityPolicyMetadata,
    evaluationRequest?: Partial<AuthorityEvaluationRequest>,
  ): Promise<AuthorityEvaluationResponseDto> {
    const result = await this.consequentialActionService.assertLegacyPolicyAllowed(
      session,
      policy,
      { body: evaluationRequest },
    );

    if (result.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(buildConsequentialActionDenial(result));
    }

    return result;
  }
}
