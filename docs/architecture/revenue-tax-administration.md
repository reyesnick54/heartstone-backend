# Revenue & Tax Administration

HeartStone's revenue domain provides a **jurisdiction-neutral** foundation for government revenue administration. It reuses Phase 11 payment and invoice infrastructure without duplicating payment rails, and keeps tax law (rates, thresholds, deadlines, exemptions, calculations) in **configurable, jurisdiction-bound** definitions rather than hard-coded country rules.

## Scope

The domain models the lifecycle architecture for:

- taxpayer registration, identifiers, and accounts (individual and business)
- tax type definitions and versioned rule configuration
- obligations, periods, returns/declarations, assessments, liabilities, balances
- credits, arrears, installment plans, objections, disputes, audits
- compliance status projections and clearance certificate requests
- withholding and employer reporting hooks (configuration-driven)
- payment allocation to liabilities via existing `PaymentTransaction` / `PaymentAllocation`

## Canonical boundaries

| Concept | Meaning | Must not imply |
|--------|---------|----------------|
| **TaxReturn / TaxDeclaration** | Taxpayer self-declaration | Authoritative assessment or verified government fact |
| **TaxAssessment** | Government liability determination | Payment receipt or compliance clearance |
| **TaxPaymentAllocation** | Apply settled funds to liability | Clearance certificate or filing compliance |
| **TaxRefundClaim** | Taxpayer request | Refund authorization or disbursement |
| **TaxRefundDecision** | Authoritative refund disposition | Automatic financial payout (uses financial refund workflow separately) |
| **TaxAuditMatter** | Review/inquiry record | Proven violation |
| **TaxComplianceStatus** | Operational projection | Legal clearance unless configured conditions met |
| **TaxCalculationRecord** | Deterministic calculation audit | AI estimate as authoritative assessment |

## Module layout

```
src/revenue/
  accounts/          TaxpayerAccountService
  returns/           TaxReturnService (versioned filing, amendments)
  assessments/       TaxAssessmentService
  calculation/       ConfigurableTaxCalculationEngine, TaxCalculationService
  payments/          TaxPaymentAllocationService (links PaymentTransaction)
  refunds/           TaxRefundService
  clearance/         TaxClearanceService
  audit/             TaxAuditMatterService
  common/            RevenueBoundaryService, RevenueAccessService
```

Registered in `RevenueModule` and exposed under `/revenue/*` with session authentication.

## Data model

Prisma models live under the `tax_*` tables (see `PHASE_REVENUE_MODEL_NAMES` in `revenue-schema.constants.ts`). Key relationships:

- `TaxTypeDefinition` → `TaxTypeDefinitionVersion` (versioned rule/config JSON, methodology reference)
- `TaxReturn` → `TaxReturnVersion` (immutable filed versions; amendments create new rows)
- `TaxAssessment` → `TaxAssessmentLine`, optional link to `TaxReturn` and required link to `TaxCalculationRecord`
- `TaxLiability` optional link to Phase 11 `Invoice` for collection via existing payment intents
- `TaxPaymentAllocation` references `PaymentTransaction` and optional `PaymentAllocation`

## Deterministic calculation

Calculations are performed through `DeterministicTaxCalculationEngine` implementations. Every persisted run creates a `TaxCalculationRecord` capturing:

- rule/configuration version
- inputs and result JSON
- calculation timestamp
- methodology reference
- jurisdiction and tax period
- actor kind (config engine, revenue officer; AI cannot issue assessments)

No jurisdiction-specific rates are embedded in application code; engines consume jurisdiction configuration only.

## Access control

Tax data uses strict isolation enforced by `RevenueAccessService`:

- **Taxpayer** — primary identity on the account only
- **Representative** — active `RepresentativeAuthority` matching organization scope
- **Revenue officer / audit reviewer** — explicit authorized actor kinds (authority evaluated outside technical roles)
- **Platform admin** — no cross-taxpayer substantive access; cannot mutate liabilities
- All decisions are appended to `TaxAccessAudit`

## Financial reuse

Tax collection should prefer linking liabilities to existing invoices and payment intents rather than creating parallel payment channels. `TaxPaymentAllocationService` records how settled `PaymentTransaction` rows apply to tax liabilities while explicitly **not** upgrading compliance or clearance state.

## Historical integrity

Submitted return versions are locked (`lockedAt`); corrections flow through new `TaxReturnVersion` rows with `isAmendment`. Assessments supersede prior assessments without deleting history. Payments, refunds, objections, and decisions retain chronological records.

## Testing

Mandatory boundary tests live in `revenue.must-fail.spec.ts` and schema guards in `revenue-schema.spec.ts`. These encode the non-negotiable separation between declaration, assessment, payment, refund, clearance, and audit concepts.
