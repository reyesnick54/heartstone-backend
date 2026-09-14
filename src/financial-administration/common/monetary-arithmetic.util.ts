import { BadRequestException } from '@nestjs/common';

import { FINANCIAL_REASON_CODES } from '../financial-administration.constants';

export function assertSameCurrency(expected: string, actual: string): void {
  if (expected.toUpperCase() !== actual.toUpperCase()) {
    throw new BadRequestException(FINANCIAL_REASON_CODES.CURRENCY_MISMATCH);
  }
}

export function rejectFxConversion(
  sourceCurrency: string,
  targetCurrency: string,
  exchangeRateSourceConfigured: boolean,
): void {
  if (
    sourceCurrency.toUpperCase() !== targetCurrency.toUpperCase() &&
    !exchangeRateSourceConfigured
  ) {
    throw new BadRequestException(FINANCIAL_REASON_CODES.FX_NOT_CONFIGURED);
  }
}

export function addCents(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + Math.trunc(amount), 0);
}

export function multiplyCents(unitAmountCents: number, quantity: number): number {
  return Math.trunc(unitAmountCents) * Math.trunc(quantity);
}

export function subtractCents(total: number, deduction: number): number {
  return Math.trunc(total) - Math.trunc(deduction);
}

export function assertNonNegativeCents(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new BadRequestException(`${label} must be a non-negative integer cent amount`);
  }
}

export function assertIntegerCents(amount: number, label: string): void {
  if (!Number.isInteger(amount)) {
    throw new BadRequestException(
      `${label} must be an integer cent amount; floating point is not permitted`,
    );
  }
}
