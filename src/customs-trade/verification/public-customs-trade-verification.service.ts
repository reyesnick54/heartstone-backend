import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomsRegistrationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CUSTOMS_TRADE_RULE_ENVIRONMENT } from '../customs-trade.constants';
import { PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS } from '../customs-trade-schema.constants';

export interface PublicCustomsTradeVerificationResponse {
  reference: string;
  verificationState: 'UNKNOWN' | 'VALID_FORMAT' | 'NOT_FOUND';
  ruleEnvironment: string;
  publicFacts: Record<string, string | boolean | null>;
}

@Injectable()
export class PublicCustomsTradeVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(reference: string): Promise<PublicCustomsTradeVerificationResponse> {
    const traderAccount = await this.prisma.traderAccount.findUnique({
      where: { accountNumber: reference },
      select: {
        accountNumber: true,
        importerRegistration: { select: { status: true } },
        exporterRegistration: { select: { status: true } },
      },
    });

    if (!traderAccount) {
      return {
        reference,
        verificationState: 'NOT_FOUND',
        ruleEnvironment: CUSTOMS_TRADE_RULE_ENVIRONMENT,
        publicFacts: {},
      };
    }

    const response: PublicCustomsTradeVerificationResponse = {
      reference: traderAccount.accountNumber,
      verificationState: 'VALID_FORMAT',
      ruleEnvironment: CUSTOMS_TRADE_RULE_ENVIRONMENT,
      publicFacts: {
        importerRegistered:
          traderAccount.importerRegistration?.status === CustomsRegistrationStatus.ACTIVE,
        exporterRegistered:
          traderAccount.exporterRegistration?.status === CustomsRegistrationStatus.ACTIVE,
      },
    };

    this.assertNoConfidentialKeys(response as unknown as Record<string, unknown>);
    return response;
  }

  assertNoConfidentialKeys(payload: Record<string, unknown>): void {
    for (const key of Object.keys(payload)) {
      if (
        PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS.includes(
          key as (typeof PUBLIC_CUSTOMS_VERIFICATION_FORBIDDEN_RESPONSE_KEYS)[number],
        )
      ) {
        throw new NotFoundException('Verification response policy violation');
      }
    }
  }
}
