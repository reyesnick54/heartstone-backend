import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import {
  CARBON_MANAGEMENT_AUTHORITY,
  CARBON_MANAGEMENT_REASON_CODES,
} from '../carbon-management.constants';

export interface AssertCarbonIssuanceAuthorityInput {
  identityId: string;
  officeholderId: string;
  appointmentId?: string;
}

@Injectable()
export class CarbonManagementAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertAuthorizationIssuanceAuthority(
    input: AssertCarbonIssuanceAuthorityInput,
  ): Promise<void> {
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(CARBON_MANAGEMENT_AUTHORITY.issue);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(
          CARBON_MANAGEMENT_REASON_CODES.AUTHORIZATION_AUTHORITY_NOT_CONFIGURED,
        );
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
      throw new ForbiddenException(
        CARBON_MANAGEMENT_REASON_CODES.AUTHORIZATION_AUTHORITY_NOT_CONFIGURED,
      );
    }
  }
}
