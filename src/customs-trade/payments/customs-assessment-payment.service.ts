import { Injectable } from '@nestjs/common';
import { CustomsAssessmentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';

@Injectable()
export class CustomsAssessmentPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  async recordPayment(input: {
    customsAssessmentId: string;
    allocatedAmountCents: number;
    paymentReference: string;
    clientPayload?: Record<string, unknown>;
  }) {
    if (input.clientPayload) {
      this.boundary.rejectClientAssessmentFields(input.clientPayload);
    }

    const assessment = await this.prisma.customsAssessment.findUnique({
      where: { id: input.customsAssessmentId },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const paidAmountCents = assessment.paidAmountCents + input.allocatedAmountCents;
    const status =
      paidAmountCents >= assessment.amountCents
        ? CustomsAssessmentStatus.PAID
        : CustomsAssessmentStatus.PARTIALLY_PAID;

    const payment = await this.prisma.customsAssessmentPayment.create({
      data: {
        customsAssessmentId: assessment.id,
        allocatedAmountCents: input.allocatedAmountCents,
        paymentReference: input.paymentReference,
        releaseTriggered: false,
      },
    });

    await this.prisma.customsAssessment.update({
      where: { id: assessment.id },
      data: { paidAmountCents, status },
    });

    this.boundary.assertPaymentDoesNotRelease();

    return {
      payment,
      cargoReleased: false,
      releaseTriggered: payment.releaseTriggered,
    };
  }
}
