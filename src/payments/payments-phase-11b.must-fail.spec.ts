import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PaymentIntentStatus } from '@prisma/client';

import { PaymentsBoundaryService } from './common/payments-boundary.service';
import { PaymentReceiptService } from './receipts/payment-receipt.service';

describe('Phase 11B must-fail boundaries', () => {
  let boundary: PaymentsBoundaryService;
  let receipts: PaymentReceiptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsBoundaryService,
        PaymentReceiptService,
        { provide: 'PrismaService', useValue: {} },
      ],
    })
      .overrideProvider(PaymentReceiptService)
      .useValue({
        assertReceiptImmutable: () => {
          throw new ForbiddenException('Payment receipts are immutable financial records');
        },
      })
      .compile();

    boundary = module.get(PaymentsBoundaryService);
    receipts = module.get(PaymentReceiptService);
  });

  it('must fail when client sets protected payment status fields', () => {
    expect(() => { boundary.rejectClientPaymentFields({ status: PaymentIntentStatus.SETTLED }); }).toThrow(
      ForbiddenException,
    );
  });

  it('must fail when receipt mutation attempted', () => {
    expect(() => receipts.assertReceiptImmutable()).toThrow(/immutable/);
  });
});
