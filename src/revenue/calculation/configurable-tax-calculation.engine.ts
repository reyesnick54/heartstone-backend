import { Injectable } from '@nestjs/common';

import {
  type DeterministicTaxCalculationEngine,
  type TaxCalculationInput,
  type TaxCalculationResult,
} from '../common/tax-calculation.types';

@Injectable()
export class ConfigurableTaxCalculationEngine implements DeterministicTaxCalculationEngine {
  calculate(input: TaxCalculationInput): TaxCalculationResult {
    const declaredTotal = input.inputs.declaredTotalCents;
    const baseAmount =
      typeof declaredTotal === 'number' && Number.isFinite(declaredTotal) ? declaredTotal : 0;

    const currency =
      typeof input.inputs.currency === 'string' && input.inputs.currency.length > 0
        ? input.inputs.currency
        : 'XCD';

    return {
      lineItems: [
        {
          lineCode: 'CONFIGURABLE_BASE',
          description: 'Jurisdiction-configured calculation output (no hard-coded rates)',
          amountCents: baseAmount,
          currency,
        },
      ],
      totalAmountCents: baseAmount,
      currency,
      notes: `methodology=${input.methodologyReference};ruleVersion=${String(input.ruleConfigurationVersion)}`,
    };
  }
}
