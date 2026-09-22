import { Injectable, NotFoundException } from '@nestjs/common';
import { DevelopmentAccessActorKind, DevelopmentFeeStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PlanningConstructionBoundaryService } from '../common/planning-construction-boundary.service';

export interface RecordDevelopmentFeePaymentInput {
  developmentProjectFeeId: string;
  paymentTransactionId: string;
  actorKind: DevelopmentAccessActorKind;
}

@Injectable()
export class DevelopmentFeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PlanningConstructionBoundaryService,
  ) {}

  async recordPayment(input: RecordDevelopmentFeePaymentInput) {
    this.boundary.assertPaymentDoesNotApprovePermit();

    const fee = await this.prisma.developmentProjectFee.findUnique({
      where: { id: input.developmentProjectFeeId },
    });
    if (!fee) {
      throw new NotFoundException(
        `DevelopmentProjectFee ${input.developmentProjectFeeId} not found`,
      );
    }

    await this.prisma.developmentProjectFee.update({
      where: { id: fee.id },
      data: {
        status: DevelopmentFeeStatus.PAID,
        paidAt: new Date(),
        paymentTransactionId: input.paymentTransactionId,
      },
    });

    return {
      feeId: fee.id,
      paymentRecorded: true,
      permitApproved: false,
    };
  }
}
