export interface EffectivePeriod {
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export function isEffectiveAt(period: EffectivePeriod, at: Date = new Date()): boolean {
  if (period.effectiveFrom > at) {
    return false;
  }

  if (period.effectiveUntil !== null && period.effectiveUntil <= at) {
    return false;
  }

  return true;
}
