import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import {
  CANNABIS_AUTHORITY,
  CANNABIS_REASON_CODES,
} from '../cannabis-administration.constants';

export interface AssertCannabisLicenceAuthorityInput {
  identityId: string;
  officeholderId: string;
  appointmentId?: string;
  functionCode?: string;
  action?: AuthorityActionType;
}

@Injectable()
export class CannabisAdministrationAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertLicenceIssuanceAuthority(input: AssertCannabisLicenceAuthorityInput): Promise<void> {
    await this.assertAuthorityForFunction({
      ...input,
      functionCode: input.functionCode ?? CANNABIS_AUTHORITY.issue,
      action: input.action ?? AuthorityActionType.ISSUE,
    });
  }

  async assertLicenceSuspensionAuthority(input: AssertCannabisLicenceAuthorityInput): Promise<void> {
    await this.assertAuthorityForFunction({
      ...input,
      functionCode: input.functionCode ?? CANNABIS_AUTHORITY.suspend,
      action: input.action ?? AuthorityActionType.SUSPEND,
    });
  }

  private async assertAuthorityForFunction(
    input: AssertCannabisLicenceAuthorityInput & {
      functionCode: string;
      action: AuthorityActionType;
    },
  ): Promise<void> {
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(input.functionCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(CANNABIS_REASON_CODES.LICENCE_AUTHORITY_NOT_CONFIGURED);
      }
      throw error;
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.identityId,
      functionAuthorityRecordId: functionRecord.id,
      action: input.action,
      officeholderId: input.officeholderId,
      appointmentId: input.appointmentId,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(CANNABIS_REASON_CODES.LICENCE_AUTHORITY_NOT_CONFIGURED);
    }
  }
}
