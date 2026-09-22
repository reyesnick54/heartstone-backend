import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
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
    const profile = await this.prisma.tradeOrganizationProfile.findUnique({
      where: { profileReference: reference },
      select: {
        profileReference: true,
        ruleEnvironment: true,
        importerStatus: true,
        exporterStatus: true,
      },
    });

    if (!profile) {
      return {
        reference,
        verificationState: 'NOT_FOUND',
        ruleEnvironment: 'NON_PRODUCTION',
        publicFacts: {},
      };
    }

    const response: PublicCustomsTradeVerificationResponse = {
      reference: profile.profileReference,
      verificationState: 'VALID_FORMAT',
      ruleEnvironment: profile.ruleEnvironment,
      publicFacts: {
        importerRegistered: profile.importerStatus === 'ACTIVE',
        exporterRegistered: profile.exporterStatus === 'ACTIVE',
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
