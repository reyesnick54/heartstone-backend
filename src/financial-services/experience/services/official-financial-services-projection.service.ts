import { Injectable } from '@nestjs/common';
import { FinancialExternalRegulatoryDependencyStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { FINANCIAL_SERVICES_EXPERIENCE_RULE_ENVIRONMENT } from '../../financial-services.constants';

@Injectable()
export class OfficialFinancialServicesProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    const awaitingExternal = await this.prisma.financialExternalRegulatoryDependency.count({
      where: {
        status: {
          in: [
            FinancialExternalRegulatoryDependencyStatus.PENDING,
            FinancialExternalRegulatoryDependencyStatus.AWAITING_EXTERNAL_DETERMINATION,
          ],
        },
      },
    });

    const openApplications = await this.prisma.financialLicenceApplicationProfile.count({
      where: { status: 'UNDER_REVIEW' },
    });

    return {
      ruleEnvironment: FINANCIAL_SERVICES_EXPERIENCE_RULE_ENVIRONMENT,
      identityId: context.identityId,
      queues: [
        {
          queueKey: 'licence_applications_under_review',
          count: openApplications,
        },
        {
          queueKey: 'awaiting_external_regulator_determination',
          count: awaitingExternal,
        },
      ],
      disclaimers: [
        'Financial regulatory workspace projections do not issue licences or external determinations.',
      ],
    };
  }
}
