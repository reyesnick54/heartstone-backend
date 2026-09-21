import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import { type ActorContextDto } from '../../identity/auth/dto/actor-context.dto';
import { INTELLIGENCE_CONSEQUENTIAL_REVIEW_FUNCTION_CODE } from '../intelligence.constants';
import { IntelligenceInstitutionalScopeService } from './intelligence-institutional-scope.service';

export interface AssertConsequentialAuthorityInput {
  actor: ActorContextDto;
  action?: AuthorityActionType;
  institutionId?: string | null;
  officeholderId?: string;
  appointmentId?: string;
}

@Injectable()
export class IntelligenceConsequentialAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
    private readonly scopeService: IntelligenceInstitutionalScopeService,
  ) {}

  async assertConsequentialAuthority(input: AssertConsequentialAuthorityInput): Promise<void> {
    this.scopeService.assertTechnicalAccessNotSubstantiveAuthority(false);
    this.scopeService.assertHumanActorForReview(input.actor);
    this.scopeService.assertInstitutionAccess(input.actor, input.institutionId);

    const primaryScope = this.scopeService.resolvePrimaryScope(input.actor);
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(
        INTELLIGENCE_CONSEQUENTIAL_REVIEW_FUNCTION_CODE,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(
          'Consequential intelligence action requires configured authority function',
        );
      }
      throw error;
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.actor.identityId,
      functionAuthorityRecordId: functionRecord.id,
      action: input.action ?? AuthorityActionType.REVIEW,
      officeholderId: input.officeholderId ?? primaryScope.officeholderId,
      appointmentId: input.appointmentId ?? primaryScope.appointmentId,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Consequential intelligence action requires explicit authority evaluation; technical access is insufficient',
      );
    }
  }
}
