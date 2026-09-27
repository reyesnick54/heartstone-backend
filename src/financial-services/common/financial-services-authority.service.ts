import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import {
  FINANCIAL_SERVICES_AUTHORITY,
  FINANCIAL_SERVICES_REASON_CODES,
} from '../financial-services.constants';

export interface AssertFinancialLicenceAuthorityInput {
  identityId: string;
  officeholderId: string;
  appointmentId?: string;
  functionCode?: string;
  action?: AuthorityActionType;
}

@Injectable()
export class FinancialServicesAuthorityService {
  constructor(
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly functionRecords: FunctionAuthorityRecordsService,
  ) {}

  async assertLicenceIssuanceAuthority(input: AssertFinancialLicenceAuthorityInput): Promise<void> {
    await this.assertAuthorityForFunction({
      ...input,
      functionCode: input.functionCode ?? FINANCIAL_SERVICES_AUTHORITY.issue,
      action: input.action ?? AuthorityActionType.ISSUE,
    });
  }

  async assertLicenceSuspensionAuthority(input: AssertFinancialLicenceAuthorityInput): Promise<void> {
    await this.assertAuthorityForFunction({
      ...input,
      functionCode: input.functionCode ?? FINANCIAL_SERVICES_AUTHORITY.suspend,
      action: input.action ?? AuthorityActionType.SUSPEND,
    });
  }

  private async assertAuthorityForFunction(
    input: AssertFinancialLicenceAuthorityInput & {
      functionCode: string;
      action: AuthorityActionType;
    },
  ): Promise<void> {
    let functionRecord;
    try {
      functionRecord = await this.functionRecords.findByCode(input.functionCode);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.LICENCE_AUTHORITY_NOT_CONFIGURED);
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
      throw new ForbiddenException(FINANCIAL_SERVICES_REASON_CODES.LICENCE_AUTHORITY_NOT_CONFIGURED);
    }
  }
}
