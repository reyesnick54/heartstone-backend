import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  FinancialExternalRegulatoryDependencyStatus,
  FinancialLicenceApplicationProfileStatus,
  FinancialLicenceLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FINANCIAL_OPERATIONAL_SNAPSHOT_PREFIX } from '../financial-services.constants';

@Injectable()
export class FinancialServicesOperationalMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeJurisdictionSnapshot(input: { jurisdictionId: string; periodStart: Date; periodEnd: Date }) {
    const registeredEntityCount = await this.prisma.financialRegulatedEntityProfile.count({
      where: { jurisdictionId: input.jurisdictionId },
    });

    const openApplicationCount = await this.prisma.financialLicenceApplicationProfile.count({
      where: {
        status: {
          in: [
            FinancialLicenceApplicationProfileStatus.LINKED,
            FinancialLicenceApplicationProfileStatus.UNDER_REVIEW,
          ],
        },
        regulatedEntityProfile: { jurisdictionId: input.jurisdictionId },
      },
    });

    const issuedLicenceCount = await this.prisma.financialLicenceRecord.count({
      where: {
        lifecycleStatus: {
          in: [
            FinancialLicenceLifecycleStatus.ISSUED,
            FinancialLicenceLifecycleStatus.EFFECTIVE,
          ],
        },
        regulatedEntityProfile: { jurisdictionId: input.jurisdictionId },
      },
    });

    const awaitingExternalCount = await this.prisma.financialExternalRegulatoryDependency.count({
      where: {
        status: {
          in: [
            FinancialExternalRegulatoryDependencyStatus.PENDING,
            FinancialExternalRegulatoryDependencyStatus.AWAITING_EXTERNAL_DETERMINATION,
            FinancialExternalRegulatoryDependencyStatus.BLOCKED,
          ],
        },
        regulatedEntityProfile: { jurisdictionId: input.jurisdictionId },
      },
    });

    const suspendedLicenceCount = await this.prisma.financialLicenceRecord.count({
      where: {
        lifecycleStatus: FinancialLicenceLifecycleStatus.SUSPENDED,
        regulatedEntityProfile: { jurisdictionId: input.jurisdictionId },
      },
    });

    const snapshotReference = `${FINANCIAL_OPERATIONAL_SNAPSHOT_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.financialServicesOperationalSnapshot.create({
      data: {
        jurisdictionId: input.jurisdictionId,
        snapshotReference,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        registeredEntityCount,
        openApplicationCount,
        issuedLicenceCount,
        awaitingExternalCount,
        suspendedLicenceCount,
      },
    });
  }
}
