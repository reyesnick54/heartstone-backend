import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import { MARITIME_AUTHORITY, MARITIME_REASON_CODES } from '../maritime.constants';

export interface AssertMaritimeIssuanceAuthorityInput {
  identityId: string;
  officeholderId: string;
  appointmentId?: string;
}

@Injectable()
export class MaritimeAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertInstrumentIssuanceAuthority(input: AssertMaritimeIssuanceAuthorityInput): Promise<void> {
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(MARITIME_AUTHORITY.issue);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(MARITIME_REASON_CODES.INSTRUMENT_AUTHORITY_NOT_CONFIGURED);
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
      throw new ForbiddenException(MARITIME_REASON_CODES.INSTRUMENT_AUTHORITY_NOT_CONFIGURED);
    }
  }
}
