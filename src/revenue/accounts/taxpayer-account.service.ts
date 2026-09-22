import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxAccessActorKind, TaxpayerAccountKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueAccessService } from '../common/revenue-access.service';
import { TAXPAYER_ACCOUNT_NUMBER_PREFIX } from '../revenue.constants';

export interface RegisterTaxpayerAccountInput {
  jurisdictionId: string;
  accountKind: TaxpayerAccountKind;
  displayName: string;
  primaryIdentityId?: string;
  organizationId?: string;
}

@Injectable()
export class TaxpayerAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: RevenueAccessService,
  ) {}

  async registerAccount(input: RegisterTaxpayerAccountInput) {
    const count = await this.prisma.taxpayerAccount.count();
    const accountNumber = `${TAXPAYER_ACCOUNT_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.taxpayerAccount.create({
      data: {
        jurisdictionId: input.jurisdictionId,
        accountNumber,
        accountKind: input.accountKind,
        displayName: input.displayName,
        primaryIdentityId: input.primaryIdentityId,
        organizationId: input.organizationId,
        registeredAt: new Date(),
      },
    });
  }

  async getAccountForAccessor(
    accessorIdentityId: string,
    taxpayerAccountId: string,
    actorKind: TaxAccessActorKind,
    representativeAuthorityId?: string,
  ) {
    await this.access.assertTaxpayerAccountAccess({
      accessorIdentityId,
      taxpayerAccountId,
      actorKind,
      endpoint: 'GET /revenue/taxpayer-accounts/:id',
      representativeAuthorityId,
      revenueOfficerAuthorized: actorKind === TaxAccessActorKind.REVENUE_OFFICER,
      auditReviewerAuthorized: actorKind === TaxAccessActorKind.AUDIT_REVIEWER,
    });

    const account = await this.prisma.taxpayerAccount.findUnique({
      where: { id: taxpayerAccountId },
      include: { identifiers: true, registrations: true },
    });
    if (!account) {
      throw new NotFoundException(`TaxpayerAccount ${taxpayerAccountId} not found`);
    }
    return account;
  }
}
