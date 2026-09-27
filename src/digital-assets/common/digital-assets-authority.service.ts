import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import { DIGITAL_ASSETS_AUTHORITY, DIGITAL_ASSETS_REASON_CODES } from '../digital-assets.constants';

export interface AssertDigitalAssetsIssuanceAuthorityInput {
  identityId: string;
  officeholderId: string;
  appointmentId?: string;
}

@Injectable()
export class DigitalAssetsAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertAuthorizationIssuanceAuthority(
    input: AssertDigitalAssetsIssuanceAuthorityInput,
  ): Promise<void> {
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(DIGITAL_ASSETS_AUTHORITY.issue);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(DIGITAL_ASSETS_REASON_CODES.AUTHORIZATION_AUTHORITY_NOT_CONFIGURED);
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
      throw new ForbiddenException(DIGITAL_ASSETS_REASON_CODES.AUTHORIZATION_AUTHORITY_NOT_CONFIGURED);
    }
  }
}
