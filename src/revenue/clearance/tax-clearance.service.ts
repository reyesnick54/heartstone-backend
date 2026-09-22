import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxClearanceCertificateRequestStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import { TAX_CLEARANCE_REQUEST_PREFIX, type TaxClearanceConditionKey } from '../revenue.constants';

@Injectable()
export class TaxClearanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
  ) {}

  async requestClearance(input: {
    taxpayerAccountId: string;
    requestedByIdentityId: string;
    clientPayload?: Record<string, unknown>;
  }) {
    if (input.clientPayload) {
      this.boundary.rejectClientTaxClearanceFields(input.clientPayload);
    }

    const count = await this.prisma.taxClearanceCertificateRequest.count();
    const requestReference = `${TAX_CLEARANCE_REQUEST_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.taxClearanceCertificateRequest.create({
      data: {
        taxpayerAccountId: input.taxpayerAccountId,
        requestReference,
        status: TaxClearanceCertificateRequestStatus.REQUESTED,
        requestedByIdentityId: input.requestedByIdentityId,
      },
    });
  }

  async issueClearanceWhenConfigured(input: {
    requestId: string;
    authoritativeConditionsMet: Partial<Record<TaxClearanceConditionKey, boolean>>;
  }) {
    const request = await this.prisma.taxClearanceCertificateRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) {
      throw new NotFoundException(`TaxClearanceCertificateRequest ${input.requestId} not found`);
    }

    this.boundary.assertClearanceAuthoritativeConditions(input.authoritativeConditionsMet);

    return this.prisma.taxClearanceCertificateRequest.update({
      where: { id: request.id },
      data: {
        status: TaxClearanceCertificateRequestStatus.ISSUED,
        issuedAt: new Date(),
        authoritativeConditionsMet: input.authoritativeConditionsMet,
      },
    });
  }
}
