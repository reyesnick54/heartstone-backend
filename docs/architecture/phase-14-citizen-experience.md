# Phase 14 — Citizen Experience API

## Objective

Provide frontend-ready orchestration and projection endpoints for the HeartStone citizen super-app. The Citizen Experience layer aggregates read models across Records, Evidence, Decisions/Issuance, Operational Support, and Application domains without duplicating official records.

## Critical rule

HeartStone may:

- project citizen-accessible documents and integrity metadata
- aggregate government-issued instruments held by a citizen or represented organization
- surface invoice, payment, receipt, refund, and dispute summaries
- list portal-safe institutional communications
- derive renewal eligibility from authoritative instrument lifecycle configuration
- orchestrate payment intent creation through existing `PaymentIntentService`

It must not:

- duplicate or mutate underlying official records through projection endpoints
- expose restricted evidence, privileged material, or internal deliberation
- treat payment or receipt as application approval or government decision
- invent renewability where instrument type configuration does not establish it
- grant cross-citizen access outside resolved identity and representation scope

## Conceptual separation

| Layer | Question answered | Does NOT mean |
|---|---|---|
| **CitizenAccessScope** | Which applications, cases, and organizations may this identity see? | Government authority |
| **CitizenDocumentsProjection** | What documents may the citizen safely view/download? | Full master file access |
| **CitizenCredentialsProjection** | What instruments does the citizen hold? | New issuance |
| **CitizenPaymentsProjection** | What fees, balances, and receipts exist? | Case approval |
| **CitizenMessagesProjection** | What delivered communications apply to this citizen? | Legal notice effectiveness |
| **CitizenRenewalsProjection** | What instruments are approaching expiry with configured renewability? | Automatic renewal authorization |

## Canonical module

All Citizen Experience logic lives under `src/citizen-experience/`:

```
src/citizen-experience/
  citizen-experience.module.ts
  citizen-experience.controller.ts
  citizen-experience.constants.ts
  common/
    citizen-access-scope.service.ts
    citizen-experience-boundary.service.ts
  documents/
    citizen-documents-projection.service.ts
  credentials/
    citizen-credentials-projection.service.ts
  payments/
    citizen-payments-projection.service.ts
  messages/
    citizen-messages-projection.service.ts
  renewals/
    citizen-renewals-projection.service.ts
  dto/
    citizen-experience-response.dto.ts
```

## HTTP surface

All routes are authenticated (`SessionAuthGuard`) under `/api/v1/experience/citizen`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/boundary` | Boundary disclaimer |
| GET | `/documents` | List citizen-accessible document projections |
| GET | `/documents/:id` | Document detail projection |
| GET | `/credentials` | List held government instruments |
| GET | `/credentials/:id` | Instrument detail projection |
| GET | `/payments` | List invoice/payment summaries |
| GET | `/payments/:id` | Payment detail projection |
| POST | `/payments/:invoiceId/intents` | Create payment intent via `PaymentIntentService` |
| GET | `/messages` | List portal-safe communications |
| GET | `/messages/:id` | Communication detail projection |
| POST | `/messages/:id/acknowledge` | Record portal acknowledgment where permitted |
| GET | `/renewals` | Derived renewal queue |

OpenAPI documentation is generated at runtime via NestJS Swagger decorators when `swaggerEnabled` is true (`/docs`).

## Access scope

`CitizenAccessScopeService` resolves:

1. Direct applications where `applicantIdentityId` matches the session identity
2. Cases and submissions linked to those applications
3. Active `RepresentativeAuthority` records for organizational representation
4. Organization applications submitted under an active representative authority

Cross-citizen access returns `403` (payments) or `404` (documents/credentials/messages) depending on information disclosure policy for the resource class.

## Document filtering

Citizen document projections exclude:

- `CONFIDENTIAL`, `RESTRICTED`, and `HIGHLY_RESTRICTED` security classifications
- `MALICIOUS`, `QUARANTINED`, and `SUSPICIOUS` malware scan results
- legal privilege and statutory confidentiality markers on document versions

Projections include integrity metadata safe for citizens (`sha256`, signature/seal/authenticity status) and download references to existing document endpoints.

## Payment boundary

Payment intent creation delegates to `PaymentIntentService` without accepting client-supplied protected totals or status fields. All payment projections carry the Phase 11B disclaimer: payment success does not alter case status or `GovernmentDecision` outcomes.

## Message acknowledgment

Portal message acknowledgment is permitted only when:

- message status is `DELIVERED` or `PARTIALLY_DELIVERED`
- channel type is `PORTAL`
- recipient matches session identity or represented organization scope
- no prior `LEGAL_ACKNOWLEDGMENT` receipt exists

Acknowledgment creates a `CommunicationReceipt` and a `SecurityAuditEvent` with action metadata.

## Renewal derivation

Renewal queue items are derived from `OfficialInstrument.effectiveUntil` and `InstrumentTypeVersion.renewalProcedure`. When `renewalProcedure` is absent, renewability is not invented. Revoked, superseded, and surrendered instruments are excluded from eligibility even when an expiry date exists.

## Dependencies

- `DatabaseModule` — Prisma access for projections
- `SessionsModule` — authenticated citizen sessions
- `IdentityCommonModule` — security audit for acknowledgments
- `OperationalSupportModule` — `PaymentIntentService` orchestration

## Tests

End-to-end coverage lives in `test/citizen-experience.e2e-spec.ts` and verifies:

- cross-citizen access denial
- restricted evidence exclusion
- revoked/expired instrument status fidelity
- payment receipt disclaimer and non-approval invariant
- recipient-scoped messages
- audited acknowledgment
- renewal derivation from lifecycle configuration
- representative organization credential access
