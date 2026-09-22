# Revenue & Tax Administration Service Pack

HeartStone provides revenue and tax administration inside the platform through a governed **service pack** plus a dedicated **`src/revenue`** domain. Citizens and businesses use **experience APIs**; officials use a **revenue workspace**. All template rules remain **`NON_PRODUCTION`**.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Payment settlement** | Financial receipt via Phase 11 payment infrastructure (`PaymentTransaction`, allocations) |
| **Tax assessment** | Official legal determination recorded in `TaxAssessment` |
| **Compliance determination** | Clearance certificates and compliance views; not implied by payment |

Payment allocation **must not** change issued assessment amounts.

## Service pack

- Manifest id: `template-revenue-tax-administration`
- On-disk template: `service-packs/templates/11-revenue-tax-administration.pack.json`
- Authoring source: `src/service-catalog/service-packs/revenue-tax-administration.template.ts`
- **14 NON_PRODUCTION template services** covering registration, returns, payments, refunds, objections, clearance, withholding, statements, and corrections
- Includes placeholder tax types, forms, evidence, workflows, fees, communications, integrations, redress, and dashboard indicators

Validation uses the standard service-pack toolkit (`validateServicePackManifest`).

## Domain module (`src/revenue`)

- **Catalog**: `TaxTypeDefinition` with governed NON_PRODUCTION template configuration
- **Taxpayer accounts**: `TaxpayerAccount` for individual (identity-linked) and business (organization-linked) taxpayers
- **Returns**: immutable filed versions via `TaxReturnVersion`; amendments create new version rows
- **Assessments**: official issuance only; boundary rejects client and AI actors
- **Payments**: `TaxPaymentAllocation` links settled transactions without altering assessments
- **Refunds**: `TaxRefundClaim` bridges to segregated financial refund authorization flow
- **Objections**: preserve assessment references for review
- **Clearance**: cannot issue when prerequisites fail
- **Audit**: `TaxAuditMatter`

Administrative routes live under `/api/v1/revenue/*` (not the experience layer).

## Experience APIs

### Citizen

- `GET /experience/citizen/revenue`
- `GET /experience/citizen/revenue/accounts`
- `GET /experience/citizen/revenue/obligations`
- `GET /experience/citizen/revenue/returns`
- `GET /experience/citizen/revenue/assessments`
- `GET /experience/citizen/revenue/payments`
- `GET /experience/citizen/revenue/actions`

Projections are scoped to the authenticated citizen taxpayer. Obligations are **not fabricated**; they derive from accounts, assessments, and configured deadlines only.

### Business

- `GET /experience/business/organizations/:organizationId/revenue`
- `GET /experience/business/organizations/:organizationId/revenue/returns`
- `GET /experience/business/organizations/:organizationId/revenue/assessments`
- `GET /experience/business/organizations/:organizationId/revenue/payments`
- `GET /experience/business/organizations/:organizationId/revenue/compliance`
- `GET /experience/business/organizations/:organizationId/revenue/actions`

Requires authorized organization membership or representative authority.

### Official revenue workspace

- `GET /experience/official/revenue/workspace`

Role-aware queue counts for registrations, returns, assessments, refunds, arrears, payment plans, objections, certificates, anomalies, and SLA risk. Analytics/AI **cannot** issue final assessments (enforced in domain boundary and workspace disclaimers).

## Testing

- Service pack: `src/service-catalog/service-packs/revenue-tax-administration.template.spec.ts`
- Domain invariants: `src/revenue/revenue-invariants.spec.ts`
- Integration: `test/revenue-tax-service-pack.integration-spec.ts`

Mandatory invariants covered: pack validation, NON_PRODUCTION labeling, access boundaries, assessment/payment/refund/objection/clearance rules, return immutability/versioning, and AI exclusion from assessment issuance.
