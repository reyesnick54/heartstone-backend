import { ForbiddenException, Injectable } from '@nestjs/common';
import { RepresentativeAuthorityStatus, TaxAccessActorKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { REVENUE_REASON_CODES } from '../revenue.constants';

export interface TaxAccessContext {
  accessorIdentityId: string;
  taxpayerAccountId: string;
  actorKind: TaxAccessActorKind;
  endpoint: string;
  representativeAuthorityId?: string;
  revenueOfficerAuthorized?: boolean;
  auditReviewerAuthorized?: boolean;
}

@Injectable()
export class RevenueAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertTaxpayerAccountAccess(context: TaxAccessContext): Promise<void> {
    const account = await this.prisma.taxpayerAccount.findUnique({
      where: { id: context.taxpayerAccountId },
    });

    if (!account) {
      throw new ForbiddenException(REVENUE_REASON_CODES.CROSS_TAXPAYER_ACCESS_DENIED);
    }

    let granted = false;
    let denialReason: string | undefined;

    if (
      context.actorKind === TaxAccessActorKind.REVENUE_OFFICER &&
      context.revenueOfficerAuthorized
    ) {
      granted = true;
    } else if (
      context.actorKind === TaxAccessActorKind.AUDIT_REVIEWER &&
      context.auditReviewerAuthorized
    ) {
      granted = true;
    } else if (context.actorKind === TaxAccessActorKind.TAXPAYER) {
      granted = account.primaryIdentityId === context.accessorIdentityId;
      if (!granted) {
        denialReason = REVENUE_REASON_CODES.CROSS_TAXPAYER_ACCESS_DENIED;
      }
    } else if (context.actorKind === TaxAccessActorKind.REPRESENTATIVE) {
      if (!context.representativeAuthorityId || !account.organizationId) {
        throw new ForbiddenException(REVENUE_REASON_CODES.REPRESENTATIVE_AUTHORITY_REQUIRED);
      }

      const authority = await this.prisma.representativeAuthority.findUnique({
        where: { id: context.representativeAuthorityId },
      });
      const now = new Date();
      granted =
        authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
        authority.identityId === context.accessorIdentityId &&
        authority.organizationId === account.organizationId &&
        authority.effectiveFrom <= now &&
        (authority.effectiveUntil == null || authority.effectiveUntil > now);

      if (!granted) {
        denialReason = REVENUE_REASON_CODES.REPRESENTATIVE_AUTHORITY_REQUIRED;
      }
    } else if (context.actorKind === TaxAccessActorKind.PLATFORM_ADMIN) {
      granted = false;
      denialReason = REVENUE_REASON_CODES.CROSS_TAXPAYER_ACCESS_DENIED;
    } else {
      granted = false;
      denialReason = REVENUE_REASON_CODES.CROSS_TAXPAYER_ACCESS_DENIED;
    }

    await this.prisma.taxAccessAudit.create({
      data: {
        taxpayerAccountId: context.taxpayerAccountId,
        accessorIdentityId: context.accessorIdentityId,
        actorKind: context.actorKind,
        endpoint: context.endpoint,
        accessGranted: granted,
        denialReason,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        denialReason ?? REVENUE_REASON_CODES.CROSS_TAXPAYER_ACCESS_DENIED,
      );
    }
  }
}
