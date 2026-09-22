# Customs & Trade Government Service Pack

HeartStone provides customs and trade administration through a governed **service pack** plus the **`src/customs-trade`** domain. Businesses, investors, and customs brokers use the **Trade Portal** business experience APIs; authorized officials use a **customs workspace**. All template rules remain **`NON_PRODUCTION`**.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Declaration submission** | Trader filing recorded in immutable declaration versions |
| **Assessment & payment** | Financial obligations via `CustomsAssessment` and `CustomsAssessmentPayment` |
| **Cargo release** | Official authorization only via `CustomsReleaseService` after server-side re-evaluation |

Declaration submission and assessment payment **must not** release cargo.

## Service pack

- Manifest id: `template-customs-trade-administration`
- On-disk template: `service-packs/templates/11-customs-trade-administration.pack.json`
- Authoring source: `src/service-catalog/service-packs/customs-trade-service-pack.template.ts`
- **16 NON_PRODUCTION template services** covering registration, declarations, permits, manifest references, inspections, holds, payments, adjustments, release review, and appeals
- Includes placeholder forms, evidence, workflows, fees, communications, integrations, redress, and dashboard indicators

Validation uses the standard service-pack toolkit (`validateServicePackManifest`).

## Domain module (`src/customs-trade`)

- **Trade profiles**: `TradeOrganizationProfile` (importer/exporter/broker registration status)
- **Shipments & declarations**: `TradeShipment`, `CustomsDeclaration`, immutable `CustomsDeclarationVersion` (amendments preserve prior versions)
- **Permits & holds**: `TradePermit`, `CustomsHold`, `CustomsInspection`
- **Assessments & payments**: `CustomsAssessment`, `CustomsAssessmentPayment` (`releaseTriggered` remains false)
- **Release**: `CustomsReleaseReview`, `CustomsReleaseRecord`, eligibility via `CustomsReleaseEligibilityService`
- **Broker scope**: `CustomsTradeAccessService` filters shipments by `RepresentativeAuthority` when the actor lacks full organization membership
- **Public verification**: `/public/customs-trade/verify/:reference` exposes policy-permitted facts only

Administrative routes live under `/api/v1/customs-trade/*` (not the experience layer).

## Business Trade Portal experience

- `GET /experience/business/organizations/:organizationId/trade`
- `GET /experience/business/organizations/:organizationId/trade/shipments`
- `GET /experience/business/organizations/:organizationId/trade/declarations`
- `GET /experience/business/organizations/:organizationId/trade/permits`
- `GET /experience/business/organizations/:organizationId/trade/assessments`
- `GET /experience/business/organizations/:organizationId/trade/holds`
- `GET /experience/business/organizations/:organizationId/trade/actions`

Trade home aggregates importer/exporter status, active shipments, declarations, inspections, holds, permits, outstanding assessments, payments, release status, document deficiencies, external dependencies, appeals, and deadlines (when configured).

Business `actions` **never** include direct cargo release execution.

## Official customs workspace

- `GET /experience/official/customs-trade/workspace`

Role-aware queue counts for declaration review, classification, valuation, permit verification, risk review, inspections, holds, release-ready, refund/adjustment, appeals, and SLA risk. Operational metrics (declarations received, holds, release backlog, port/border dependencies) are **informational only**.

## Release guardrails

Release availability and execution require:

- Required reviews complete
- Active official release authority
- No active holds
- Required permits satisfied
- Payment conditions satisfied when configured
- External dependencies satisfied
- Document deficiencies resolved

Official available-actions may preview eligibility; **execution re-evaluates** all conditions.

## Testing

- Service pack: `src/service-catalog/service-packs/customs-trade-service-pack.template.spec.ts`
- Domain invariants: `src/customs-trade/customs-trade-invariants.spec.ts`
- Must-fail gates: `src/customs-trade/customs-trade.must-fail.spec.ts`
- Integration: `test/customs-trade-service-pack.integration-spec.ts`

Mandatory invariants covered: pack validation, NON_PRODUCTION labeling, organization/shipment access boundaries, broker scope, declaration/payment non-release, hold/permit release blocks, AI exclusion, official authority, declaration amendment versioning, and public API confidentiality.
