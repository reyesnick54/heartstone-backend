# Citizen Experience API

## Objective

The Citizen Experience layer is a Backend-for-Frontend (BFF) orchestration surface for mobile and web citizen portals. It aggregates existing HeartStone domain modules into stable, frontend-ready responses without duplicating domain models or authority semantics.

Citizens and authorized representatives interact with this layer instead of navigating hundreds of backend models directly.

## Architectural placement

```
Citizen Portal / Mobile App
          │
          ▼
┌─────────────────────────────┐
│  src/experience/citizen/    │  ← BFF orchestration (this layer)
└─────────────────────────────┘
          │
          ├─ Identity (session, profile, representation)
          ├─ Application Processing (applications, cases, status)
          ├─ Operational Support (invoices, communications)
          ├─ Decisions Issuance (instruments)
          ├─ Redress (appeals matters)
          └─ Service Catalog (recommendations)
```

## Module structure

| Path | Purpose |
|---|---|
| `src/experience/experience.module.ts` | Top-level experience module |
| `src/experience/citizen/citizen-experience.module.ts` | Citizen BFF module |
| `src/experience/citizen/citizen-experience.controller.ts` | HTTP surface |
| `src/experience/common/citizen-access.service.ts` | Scope resolution and ownership enforcement |
| `src/experience/citizen/services/*` | Aggregation services |

## Authentication and actor context

All endpoints require an authenticated session (`SessionAuthGuard` + `@ApiBearerAuth`).

The current citizen is always derived from `SessionContextDto.identityId`. Client-supplied identity identifiers are never accepted.

Suspended or inactive accounts are rejected during session validation.

## API surface (`/api/v1/experience/citizen/...`)

| Method | Route | Description |
|---|---|---|
| `GET` | `/me` | Profile, classification, org/representation relationships, assurance summary, communication preferences |
| `GET` | `/home` | Dashboard summary counts and recent items |
| `GET` | `/actions` | Canonical citizen action center (paginated) |
| `GET` | `/applications` | Owned/represented applications (paginated) |
| `GET` | `/applications/:id` | Single application detail |
| `GET` | `/cases/:id/status` | Applicant-safe case status |

OpenAPI documentation is available at `/docs` when Swagger is enabled.

## Response design principles

1. **Data minimization** — only non-sensitive, applicant-visible fields
2. **No authority semantics** — responses never imply government decision authority
3. **Localization-ready labels** — each user-facing label includes `label` and optional `labelKey`
4. **Institution attribution** — service and institution context on list/detail/action items
5. **Deep links** — stable `route` + `params` for frontend navigation
6. **Deterministic sorting** — stable ordering for pagination and action priority
7. **Disclaimers** — informational status is explicitly non-decisional

## Access control

`CitizenAccessService` resolves accessible scope:

- Direct applications/cases where `applicantIdentityId` matches session identity
- Representative applications where an **active** `RepresentativeAuthority` exists for the same identity and organization

Expired, ended, revoked, or suspended representative authorities are excluded.

Cross-citizen access returns `403 Forbidden`.

## Action center derivation

Actions are derived only from existing platform state. Supported action codes:

| Code | Derived from |
|---|---|
| `PROVIDE_MISSING_INFORMATION` | Case `WAITING_APPLICANT`, open deficiency notices |
| `PAY_INVOICE` | Outstanding invoices linked to accessible cases |
| `REVIEW_GOVERNMENT_MESSAGE` | Applicant-visible case communications |
| `ACKNOWLEDGE_NOTICE` | Applicant-visible deficiency notices |
| `RENEW_INSTRUMENT` | Instruments expiring within 90 days |
| `RESPOND_TO_REQUEST` | Open applicant information requests |
| `COMPLETE_DRAFT_APPLICATION` | Draft applications |
| `SUBMIT_APPEAL` | Reserved for supported redress routes (not fabricated) |

The action center does not invent tasks when no underlying state exists.

## Home aggregation

Home counts include:

- Active applications
- Action required (waiting applicant + outstanding payments)
- Pending government requests
- Recent decisions (case-linked, last 90 days)
- Issued credentials/instruments
- Outstanding payments
- Upcoming expirations/renewals
- Unread/recent applicant-visible messages
- Open appeals/redress matters
- Related service recommendations (same service family, not yet applied)

Excluded from all citizen responses:

- Internal officer notes
- Restricted evidence
- Internal authority analysis
- Security-sensitive account internals
- Another citizen's records

## Domain reuse (no duplication)

This layer orchestrates existing modules and Prisma read queries. It does **not** create parallel models for:

- Identity
- GovernmentService
- Application / Case
- Evidence / Records
- Payment / Communication
- Decision / OfficialInstrument

## Testing invariants

Integration tests verify:

- Citizen sees only own data
- Authorized representative sees only represented scope
- Cross-citizen access fails
- Suspended account fails
- Home aggregation handles zero records
- Action center does not invent actions
- Restricted internal records are excluded
- Pagination works
- Expired/inactive representation excluded
- Frontend response shape is stable

## Future extensions

Potential additions (not in initial surface):

- `/experience/citizen/cases/:id/timeline`
- `/experience/citizen/instruments`
- `/experience/citizen/payments`
- Public unauthenticated discovery routes remain under `/public/*`
