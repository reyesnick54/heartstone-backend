import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialLicenceApplicationProfileStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FinancialServicesBoundaryService } from '../common/financial-services-boundary.service';
import { FINANCIAL_LICENCE_APPLICATION_PROFILE_PREFIX } from '../financial-services.constants';

@Injectable()
export class FinancialLicenceApplicationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialServicesBoundaryService,
  ) {}

  async linkApplicationProfile(input: {
    regulatedEntityProfileId: string;
    activityCategoryCode: string;
    applicationId?: string;
    caseId?: string;
    requiresNationalDetermination?: boolean;
    licencesCreated?: number;
  }) {
    this.boundary.assertApplicationProfileDoesNotIssueLicence(true, input.licencesCreated ?? 0);

    const entity = await this.prisma.financialRegulatedEntityProfile.findUnique({
      where: { id: input.regulatedEntityProfileId },
    });
    if (!entity) {
      throw new NotFoundException('Financial regulated entity profile not found');
    }

    const applicationReference = `${FINANCIAL_LICENCE_APPLICATION_PROFILE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.financialLicenceApplicationProfile.create({
      data: {
        id: randomUUID(),
        applicationReference,
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        activityCategoryCode: input.activityCategoryCode,
        applicationId: input.applicationId,
        caseId: input.caseId,
        status: FinancialLicenceApplicationProfileStatus.LINKED,
        doesNotIssueLicence: true,
        requiresNationalDetermination: input.requiresNationalDetermination ?? false,
      },
    });
  }
}
