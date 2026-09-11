import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthorityEvaluationOutcome } from '@prisma/client';

import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { AuthorityEvaluationService } from '../evaluation/authority-evaluation.service';
import { type AuthorityEvaluationRequest } from '../evaluation/authority-evaluation.types';
import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';
import { type AuthorityPolicyMetadata } from './authority-policy.decorator';

@Injectable()
export class AuthorityPolicyService {
  constructor(
    private readonly evaluationService: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertAuthorized(
    session: SessionContextDto,
    policy: AuthorityPolicyMetadata,
    evaluationRequest?: Partial<AuthorityEvaluationRequest>,
  ): Promise<AuthorityEvaluationResponseDto> {
    let functionAuthorityRecordId = policy.functionAuthorityRecordId;
    if (!functionAuthorityRecordId) {
      if (!policy.functionCode) {
        throw new ForbiddenException('Authority policy is misconfigured');
      }
      functionAuthorityRecordId = (await this.functionRecords.findByCode(policy.functionCode)).id;
    }

    const result = await this.evaluationService.evaluate({
      identityId: session.identityId,
      functionAuthorityRecordId,
      action: policy.action,
      ...evaluationRequest,
    });

    if (result.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException({
        message: 'Authority evaluation did not permit this action.',
        evaluation: result,
      });
    }

    return result;
  }
}
