# Customs, Trade & Border Commerce Foundation

## Objective

Provide a jurisdiction-neutral customs and border-commerce domain for administering imports, exports, declarations, permits, cargo references, assessments, inspections, holds, release decisions, adjustments, refunds, and trade-facilitation workflows. Legal tariff schedules, sanctions lists, prohibited-goods law, and country-specific trade rules are **not** embedded in core HeartStone; they arrive through configured nomenclature references, external authority dependencies, and Government Service Packs.

## Canonical module

All customs/trade foundation logic lives under `src/customs-trade/`.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **TraderAccount / registrations** | Who is authorized to trade and under which organization identity? |
| **CustomsDeclaration + versions** | What did the trader declare (not verified fact)? |
| **CustomsValuationRecord** | What value was declared vs assessed vs accepted? |
| **CommodityClassificationReference** | Which configured nomenclature code applies (AI suggestions are non-authoritative)? |
| **TradePermitReference / RestrictedGoodsRequirement** | Which permits or partner-agency approvals are referenced? |
| **CustomsAssessment** | What official duty/tax/fee assessment was issued (not self-declaration)? |
| **CustomsHold** | What auditable block applies to release? |
| **CustomsInspection** | Which compliance inspection occurred (not seizure)? |
| **CustomsReleaseDecisionReference / CustomsReleaseRecord** | What authorized release was recorded? |
| **PaymentAllocation / TaxAssessment (optional links)** | What revenue artifacts relate (payment ≠ release)? |
| **CustomsExternalDependency** | What authenticated external determinations were received? |

## Explicit boundaries

- Declaration ≠ verified fact
- Declaration ≠ assessment
- Payment ≠ release
- Inspection ≠ seizure
- Risk score ≠ violation
- AI classification suggestion ≠ authoritative customs classification
- Cargo arrival ≠ customs release
- Organization membership ≠ broker/agent authorization (`RepresentativeAuthority` required)

## Core models

- `TraderAccount`, `ImporterRegistration`, `ExporterRegistration`
- `CustomsBrokerAuthorization` → `RepresentativeAuthority` (brokers, agents, forwarders, company reps)
- `ShipmentReference`, `CargoManifestReference`, `BorderEntryReference`
- `CustomsDeclaration`, `CustomsDeclarationVersion`, `CustomsDeclarationItem`
- `CommodityClassificationReference`, `OriginDeclaration`, `CustomsValuationRecord`
- `TradePermitReference`, `RestrictedGoodsRequirement`
- `CustomsAssessment`, `CustomsAssessmentLine`
- `CustomsHold`, `CustomsInspection` (links `InspectionRecord`)
- `CustomsReleaseDecisionReference`, `CustomsReleaseRecord`
- `CustomsAdjustment`, `CustomsRefundClaim`, `CustomsStatusHistory`
- `CustomsExternalDependency`

## Trade representation

`CustomsBrokerAuthorization` binds an active `RepresentativeAuthority` to a `TraderAccount` with an explicit `TradeRepresentationKind`. HeartStone does not infer broker power from `OrganizationMembership` alone (`doesNotInferFromMembership` defaults to true).

## Classification & valuation

- `CommodityClassificationReference.nomenclatureSystemCode` identifies configured external nomenclature (no hard-coded HS/WCO table in core).
- `CustomsValuationRecord.valuationKind` separates `DECLARED`, `ASSESSED`, and `ACCEPTED` amounts.

## Duties & payments

`CustomsAssessment` may reference `TaxAssessment` and `PaymentAllocation` for reconciliation with the revenue domain without duplicating payment rails. Recording payment does not release cargo (`paymentRecordedDoesNotRelease` on release records).

## Holds & inspections

- Holds record basis references, block release when configured, and require governed removal (officeholder + decision reference).
- Inspections link existing Phase 9 `InspectionRecord` rows with `inspectionIsNotSeizure` defaulting to true.

## External dependencies

`CustomsExternalDependency` supports port authorities, agriculture, health, environment, security, sanctions systems, transport, and external customs systems via `ExternalAuthority` and authenticated payload hashes.

## API surface (foundation)

- `POST /api/v1/customs-trade/declarations` — submit declaration (does not release cargo)
- `POST /api/v1/customs-trade/declarations/:id/amendments` — amend with preserved prior version

Orchestration endpoints for assessments, holds, and release will expand with service-pack workflows.

## Non-goals (foundation boundary)

This foundation does **not**:

- implement tariff computation, sanctions matching, or prohibited-goods law
- auto-release on declaration, payment, or cargo arrival
- treat AI suggestions or risk scores as violations or release authority
- replace port, carrier, or foreign customs systems of record
