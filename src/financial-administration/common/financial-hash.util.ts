import { createHash } from 'node:crypto';

export interface FeeAssessmentHashInput {
  feeScheduleVersionId: string;
  calculatedItems: unknown[];
  subtotalCents: number;
  adjustmentsCents: number;
  totalCents: number;
  currency: string;
  calculationInputs: Record<string, unknown>;
}

export function computeFeeAssessmentIntegrityHash(input: FeeAssessmentHashInput): string {
  const payload = JSON.stringify({
    feeScheduleVersionId: input.feeScheduleVersionId,
    calculatedItems: input.calculatedItems,
    subtotalCents: input.subtotalCents,
    adjustmentsCents: input.adjustmentsCents,
    totalCents: input.totalCents,
    currency: input.currency,
    calculationInputs: input.calculationInputs,
  });

  return createHash('sha256').update(payload).digest('hex');
}
