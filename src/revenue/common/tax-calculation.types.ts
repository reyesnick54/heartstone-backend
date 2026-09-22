import { type TaxCalculationSourceKind } from '@prisma/client';

export interface TaxCalculationInput {
  jurisdictionId: string;
  taxPeriodId: string;
  taxTypeDefinitionVersionId: string;
  ruleConfigurationVersion: number;
  methodologyReference: string;
  inputs: Record<string, unknown>;
  calculatedByActorKind: TaxCalculationSourceKind;
  calculatedByIdentityId?: string;
}

export interface TaxCalculationResult {
  lineItems: {
    lineCode: string;
    description: string;
    amountCents: number;
    currency: string;
  }[];
  totalAmountCents: number;
  currency: string;
  notes?: string;
}

export interface DeterministicTaxCalculationEngine {
  calculate(input: TaxCalculationInput): TaxCalculationResult;
}
