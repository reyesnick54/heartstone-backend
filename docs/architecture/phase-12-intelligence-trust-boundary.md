# Phase 12 — Intelligence Trust Boundary

## Objective

Ensure no consequential or restricted Intelligence API trusts identity, institutional scope, reviewer identity, owner identity, or similar actor attributes supplied by an untrusted client.

## Actor context

All protected Intelligence routes resolve a canonical authenticated `ActorContext` from the session via `@CurrentActor()`:

- `identityId` — always from the validated session, never from request bodies
- `institutionalScopes` — derived from active `IdentityOfficeholderLink` + current `Appointment` records
- `isAiActor` — true for `IdentityType.SERVICE` identities
- `isSuspendedAiAgent` — true when service authentication is disabled or credentials are revoked

Global `SessionAuthGuard` resolves canonical `ActorContext`; `IntelligenceSuspendedAiGuard` and institutional scope services enforce this boundary on every non-public Intelligence route.

## Endpoint categories

| Category | Description | Auth |
|---|---|---|
| **A — Public informational** | Boundary disclaimers only | None |
| **B — Authenticated operational** | Metrics, twins, simulations, analysis, monitoring, dashboards | Session + actor context |
| **C — Restricted institutional** | Institution/department-scoped reads and writes | Session + actor context + scope validation |
| **D — Consequential review/approval** | Claim review, consequential-use review, live transitions, consequential alert verification | Session + actor context + `AuthorityEvaluationService` |

## Rejected client fields

Acting identity fields (`ownerIdentityId`, `reviewerIdentityId`, `capturedByIdentityId`, etc.) are rejected when supplied by clients. The server derives these from `@CurrentActor()`.

Authority indicators (`authorityGranted`, `delegationId`, `governmentDecisionId`, etc.) are rejected on Intelligence mutation payloads.

## Institutional scoping

`IntelligenceInstitutionalScopeService` centralizes:

- institution membership checks
- department scoping where required
- cross-case / cross-institution retrieval blocks
- technical-access-only rejection for substantive dashboard use

## Consequential authority

`IntelligenceConsequentialAuthorityService` invokes `AuthorityEvaluationService` only for category **D** actions. Ordinary reads and non-consequential writes do not require authority evaluation.

## Phase 12 invariants preserved

- AI cannot approve, decide, or issue
- recommendation != decision
- risk != sanction
- alert != verified violation
- dashboard != authority
- simulation != live operation
- report != decision notice

Technical session access alone does not authorize institutional Intelligence action.
