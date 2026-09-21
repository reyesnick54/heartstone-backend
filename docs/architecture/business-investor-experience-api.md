# Business & Investor Experience API

## Objective

The Business & Investor Experience layer is a Backend-for-Frontend (BFF) orchestration surface for unified business, company, employer, and investor government accounts. It aggregates existing HeartStone domain modules into stable, frontend-ready responses without duplicating domain models.

Business users interact with one government account covering licensing, corporate registration, employees, work permits, property, customs, strategic projects, compliance, payments, and government correspondence.

## Architectural placement

```
Business / Investor Portal
          │
          ▼
┌──────────────────────────────┐
│  src/experience/business/    │  ← BFF orchestration (this layer)
└──────────────────────────────┘
          │
          ├─ Identity (membership, representative authority)
          ├─ Application Processing (applications, cases)
          ├─ Operational Support (invoices, communications)
          ├─ Decisions Issuance (licenses/instruments)
          ├─ Compliance (matters, obligations)
          └─ Intelligence (strategic investment projects)
```

## Module structure

| Path | Purpose |
|---|---|
| `src/experience/experience.module.ts` | Top-level experience module |
| `src/experience/business/business-experience.module.ts` | Business BFF module |
| `src/experience/business/business-experience.controller.ts` | HTTP surface |
| `src/experience/common/business-access.service.ts` | Organization scope resolution and enforcement |
| `src/experience/business/services/*` | Aggregation services |

## Authentication and actor context

All endpoints require an authenticated session (`SessionAuthGuard` + `@ApiBearerAuth`).

The current actor is always derived from `SessionContextDto.identityId`. Client-supplied identity or organization identifiers are never trusted for authorization.

## API surface (`/api/v1/experience/business/...`)

| Method | Route | Description |
|---|---|---|
| `GET` | `/organizations` | Organizations accessible via active membership or representative authority |
| `GET` | `/organizations/:organizationId` | Organization detail and registration status summary |
| `GET` | `/organizations/:organizationId/home` | Unified business home dashboard counts and recent items |
| `GET` | `/organizations/:organizationId/actions` | Canonical action center (paginated) |
| `GET` | `/organizations/:organizationId/applications` | Organization applications (paginated) |
| `GET` | `/organizations/:organizationId/licenses` | Organization-held licenses and permits |
| `GET` | `/organizations/:organizationId/compliance` | Compliance matters and outstanding obligations |
| `GET` | `/organizations/:organizationId/payments` | Outstanding fees and invoices |
| `GET` | `/organizations/:organizationId/messages` | Applicant-visible government messages |
| `GET` | `/organizations/:organizationId/projects` | Strategic investment project summaries |

OpenAPI documentation is available at `/docs` when Swagger is enabled.

## Access control

`BusinessAccessService` resolves organization access from:

- **Active OrganizationMembership** — grants full organization visibility (read scope)
- **Active RepresentativeAuthority** — grants scoped access to applications linked to the authority

Expired, ended, revoked, or suspended memberships and authorities are excluded.

Cross-organization UUID access returns `403 Forbidden`. Supplying an organization UUID alone never grants access.

Representatives without membership see only applications tied to their active representative authority records.

## Business home aggregation

Home counts include, where available:

- Corporate identity / registration status (via organization detail)
- Active government applications
- Active licenses / permits
- Licenses approaching expiry (90-day horizon)
- Outstanding government actions
- Outstanding fees / invoices
- Government messages
- Compliance obligations
- Inspections / corrective actions
- Employee / workforce-related matters
- Property / project matters
- Customs / trade-related matters (zero when no linked records)
- Strategic investment projects
- Appeals / redress (zero when no linked records)
- Upcoming deadlines

## Action center derivation

Actions are derived only from existing platform state:

| Code | Derived from |
|---|---|
| `PROVIDE_MISSING_INFORMATION` | Case `WAITING_APPLICANT`, open deficiency notices |
| `SUBMIT_REQUESTED_INFORMATION` | Open applicant information requests |
| `PAY_INVOICE` | Outstanding invoices linked to accessible cases |
| `RENEW_LICENSE` | Organization-held instruments expiring within 90 days |
| `SATISFY_COMPLIANCE_OBLIGATION` | Due or overdue continuing obligations |
| `RESPOND_TO_CORRECTIVE_ACTION` | Compliance matters in `CORRECTIVE_ACTION` |
| `RESPOND_TO_GOVERNMENT_CORRESPONDENCE` | Applicant-visible case communications |
| `RESPOND_TO_INSPECTION_REQUIREMENT` | Applicant-visible deficiency notices |
| `COMPLETE_DRAFT_APPLICATION` | Draft applications |
| `COMPLETE_PROJECT_SUBMISSION` | Reserved for supported project submission routes (not fabricated) |
| `SUBMIT_EMPLOYEE_DOCUMENTATION` | Reserved for supported workforce routes (not fabricated) |
| `INITIATE_APPEAL` | Reserved for supported redress routes (not fabricated) |

The action center does not invent tasks when no underlying state exists.

## Investor experience

Investors may access organizations through membership or representative authority. Strategic project summaries surface:

- Active investment applications (via linked cases)
- Strategic project lifecycle stage
- Government dependencies
- Evidence record counts (not restricted internal evidence)
- Project milestones with explicit verified-completion flags
- Status projection disclaimers

Reported milestones (`REPORTED`, `SUBMITTED`, `REVIEWED`) are never treated as verified completion unless status is `VERIFIED`, `ACCEPTED`, `COMPLETED`, or `REVALIDATED` with a `verifiedDate`.

## Data minimization

Business responses exclude:

- Internal government deliberation
- Restricted evidence
- Officer-only notes (`INTERNAL_NOTE`, `INTERNAL` visibility)
- Internal authority assessments
- Unrelated organization information
- Security-sensitive data

Payment listings include an explicit `paymentDoesNotImplyApproval: true` flag on each item.

## Response design principles

1. **Aggregation only** — no duplicate domain models
2. **Localization-ready labels** — each user-facing label includes `label` and `labelKey`
3. **Institution attribution** — service and institution context on list items
4. **Deep links** — stable `route` + `params` for frontend navigation under `business.*` routes
5. **Deterministic sorting** — stable ordering for pagination and action priority
6. **Disclaimers** — informational status is explicitly non-decisional

## Testing

Mandatory regression coverage lives in:

- `test/business-experience.integration-spec.ts`
- `test/business-experience.e2e-spec.ts`

Tests verify unauthorized access denial, inactive membership failure, revoked representative authority failure, representative scope limits, cross-business UUID denial, investor project isolation, internal note exclusion, payment disclaimer semantics, authoritative compliance status, milestone verification boundaries, and non-fabricated action center behavior.
