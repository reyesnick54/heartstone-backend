import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import { PLANNING_AUTHORITY, PLANNING_REASON_CODES } from '../planning-construction.constants';

export interface AssertPlanningPermitAuthorityInput {
  identityId: string;
  officeholderId: string;
  appointmentId?: string;
}

@Injectable()
export class PlanningConstructionAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertPermitIssuanceAuthority(input: AssertPlanningPermitAuthorityInput): Promise<void> {
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(PLANNING_AUTHORITY.permitIssue);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(PLANNING_REASON_CODES.PERMIT_AUTHORITY_NOT_CONFIGURED);
      }
      throw error;
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.identityId,
      functionAuthorityRecordId: functionRecord.id,
      action: AuthorityActionType.ISSUE,
      officeholderId: input.officeholderId,
      appointmentId: input.appointmentId,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(PLANNING_REASON_CODES.PERMIT_AUTHORITY_NOT_CONFIGURED);
    }
  }
}
