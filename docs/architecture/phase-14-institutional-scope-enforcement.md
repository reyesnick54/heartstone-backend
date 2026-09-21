# Phase 14 — Institutional Scope Enforcement

## Objective

Eliminate cross-institution, cross-department, cross-case, and cross-owner IDOR vulnerabilities by enforcing institutional ownership on every restricted resource lookup.

Possession or guessing of a UUID must never grant access.

## Position in the platform stack

| Layer | Responsibility |
|---|---|
| **Session authentication** | Proves who the actor is (`SessionAuthGuard`) |
| **Institutional scope enforcement** | Proves the actor may see or touch this specific resource within institutional boundaries |
| **Authority evaluation** | Proves the actor may perform a consequential government action (`AuthorityEvaluationService`) |

Institutional scope enforcement does **not** replace the Authority Engine. Scope answers “may this actor reach this record at all?” Authority answers “may this actor perform this official action?”

## Canonical module

Implementation lives in `src/institutional-scope/`:

| Component | Role |
|---|---|
| `ResourceOwnershipResolver` | Resolves institutional ownership for each scoped resource type |
| `ActorContextService` | Builds actor context from authenticated server-side session only |
| `InstitutionalScopeService` | Evaluates visibility, modification, and institutional-boundary intent |
| `ResourceAccessService` | Assert helpers, anti-enumeration masking, structured audit on denial |
| `InstitutionalScopeGuard` + `@RequireResourceScope()` | Reusable controller enforcement |

## Scoped resource types

- institution, department, office
- identity, organization
- case, application
- master administrative file, evidence packet, evidence record
- official instrument, government decision
- compliance matter, redress matter
- dashboard, strategic project

## Access paths (evaluated in order)

1. **Self** — actor accessing their own identity record
2. **Applicant / holder** — legitimate applicant or instrument holder visibility
3. **Representative** — active `RepresentativeAuthority` within organization scope
4. **Organization member** — visibility for organization-held resources (not consequential actions)
5. **Official** — active officeholder link with matching institution and department appointments

## Fail-closed rules

- unresolved ownership → deny
- ambiguous scope → deny
- missing institutional linkage on restricted resources → deny
- cross-institution / cross-department / cross-organization mismatch → deny
- inactive or out-of-scope representative authority → deny
- service identity or technical administrator → deny substantive government data
- raw UUID without a legitimate path → deny

## Intent separation

| Intent | Scope layer behavior |
|---|---|
| `VISIBILITY` | Read/view access within institutional boundaries |
| `MODIFICATION` | Stronger applicant and official checks; draft/update paths |
| `CONSEQUENTIAL_ACTION` | Institutional boundary only; sets `requiresAuthorityEvaluation=true` |

Consequential routes must still call `AuthorityEvaluationService`.

## Security audit

Denied IDOR/scope attempts emit immutable `SecurityAuditEvent` records with type `SCOPE_ACCESS_DENIED`, including resource type/id, intent, denial reason, and ownership snapshot metadata.

## Initial domain integration

High-risk paths migrated first:

- application-processing (`ApplicationsService`, `CasesService`)
- intelligence dashboards (`DashboardAccessPolicyService`)
- evidence records (`EvidenceRecordsService`)
- records / master administrative files (`MasterAdministrativeFileController`)
- decisions (`DecisionsController` case boundary checks)
- compliance matters (`ComplianceMatterService`)
- redress matters (`RedressMatterService`, authenticated GET)

Additional domains should adopt `ResourceAccessService` incrementally rather than through uncontrolled rewrites.

## Explicit exclusions

- Does not evaluate function authority, delegation, or appointment validity for consequential actions
- Does not create or infer government decision authority
- Does not replace domain-specific content filtering (e.g. MAF section sanitization, document classification)
