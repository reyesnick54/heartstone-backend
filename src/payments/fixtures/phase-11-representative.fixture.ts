import { FeeAdjustmentType, FeeScheduleVersionStatus } from '@prisma/client';

export const phase11RepresentativeFixture = {
  feeSchedule: {
    code: 'FS-TEST-001',
    name: 'Test Fee Schedule',
    status: 'ACTIVE' as const,
  },
  feeScheduleVersion: {
    versionNumber: 1,
    effectiveFrom: new Date('2025-01-01'),
    permittedAdjustmentRoutes: [FeeAdjustmentType.WAIVER, FeeAdjustmentType.REDUCTION],
    status: FeeScheduleVersionStatus.ACTIVE,
  },
  invoice: {
    invoiceNumber: 'INV-TEST-001',
    amountDueCents: 10000,
    amountPaidCents: 10000,
    currency: 'XCD',
    status: 'PAID' as const,
    dueDate: new Date('2025-06-01'),
    issuedAt: new Date('2025-05-01'),
  },
  paymentTransaction: {
    providerReference: 'PAY-TEST-001',
    amountCents: 10000,
    settledAmountCents: 10000,
    currency: 'XCD',
    status: 'SETTLED' as const,
    settledAt: new Date('2025-05-02'),
  },
};
