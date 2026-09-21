# Official Experience API

HeartStone's Official Experience API provides a **role/context-specific government workstation** for authenticated officials. It is not an RBAC-only admin panel. The workspace derives what an official can **see** and which actions may be **presented** from server-side institutional facts.

## Architectural invariants

The following separations are preserved throughout this API:

| Concept | Meaning in this API |
|---------|---------------------|
| **User** | Authenticated identity (login session) |
| **Officeholder** | Institutional position record linked to an identity |
| **Appointment** | Time-bounded assignment of officeholder to office |
| **Permission** | Technical capability flags (e.g. can open workspace shell) |
| **Authority** | Evaluated per consequential action via `AuthorityEvaluationService` |

**Authentication does not confer government authority.** The `/me` endpoint explicitly sets `hasUniversalAuthority: false` and includes an authority disclaimer.

**Assignment does not imply authority.** Case assignment controls visibility and queue presentation only. Consequential actions require separate authority evaluation.

## Module location

```
src/experience/
  experience.module.ts
  official/
    official.module.ts
    official.controller.ts
    guards/official-experience.guard.ts
    services/
```

Registered in `AppModule` as `ExperienceModule`.

## Authentication and access tiers

All endpoints require `SessionAuthGuard` (Bearer token).

`OfficialExperienceGuard` enforces:

1. Identity is not `SERVICE` / AI automation
2. Identity has at least one active `IdentityOfficeholderLink`
3. For substantive endpoints: at least one **current** `Appointment`

| Tier | Endpoints | Requirement |
|------|-----------|-------------|
| Official shell | `GET /me` | Officeholder link |
| Substantive workspace | all other endpoints | Active appointment |

Citizens, service identities, and identities without officeholder links receive `403 Forbidden`.

## Endpoints

Base path: `/api/v1/experience/official`

### `GET /me`

Returns the official identity summary:

- Authenticated identity (`identityId`, `displayName`, `assuranceLevel`)
- Officeholder links (link does **not** confer authority)
- Active appointments with office, department, institution
- Active delegations (recipient scope)
- Institutional context (`institutionIds`, `departmentIds`, `officeIds`)
- Technical workspace capabilities
- `hasUniversalAuthority: false` always
- `authorityDisclaimer` string

### `GET /workspace`

Frontend-ready dashboard summary scoped to the official's institutional context:

- Assigned cases
- Department unassigned case pool (where permitted)
- Cases awaiting review
- Completeness issues
- Outstanding information requests
- Pending referrals
- Decision-ready cases
- SLA / milestone risks
- Inspection tasks
- Appeals/redress assignments
- Expiring instruments requiring renewal action
- Unread government messages
- Intelligence alerts for the recipient

Includes `assignmentDoesNotImplyAuthority: true`.

### `GET /work-queue`

Normalized, sortable queue entries:

```json
{
  "queueItemType": "assigned-case",
  "priority": "NORMAL",
  "institutionId": "...",
  "departmentId": "...",
  "caseId": "...",
  "caseNumber": "...",
  "deadlineAt": "...",
  "status": "...",
  "assignedOfficeholderId": "...",
  "actionRoute": "/experience/official/cases/{id}",
  "reason": "Case assigned to you"
}
```

Queue item types include: `assigned-case`, `department-unassigned-case`, `awaiting-review`, `completeness-issue`, `information-request`, `pending-referral`, `decision-ready`, `sla-risk`, `inspection-task`, `appeals-assignment`, `instrument-renewal`, `government-message`, `intelligence-alert`.

### `GET /cases`

Lists cases visible within scope:

- Cases assigned to the official
- Cases where official is case manager
- Unassigned cases in the official's department pool

Cases outside department scope or assigned exclusively to another official are excluded.

### `GET /cases/:id`

Case detail for in-scope cases: status, service, workflow active steps, case manager, access kind.

### `GET /cases/:id/available-actions`

**Server-evaluated action availability** for UI presentation. Does **not** execute actions.

Each action includes:

| Field | Purpose |
|-------|---------|
| `actionKey` | Stable UI identifier |
| `label` / `description` | Human-readable presentation |
| `available` | Server-evaluated availability |
| `isConsequential` | Whether authority evaluation applies |
| `authorityAction` | Mapped `AuthorityActionType` when applicable |
| `evaluationOutcome` | Result from `AuthorityEvaluationService` |
| `unavailableReason` | Safe frontend-facing explanation (no privileged governing-source material) |
| `executionRoute` | Authoritative domain endpoint for execution |
| `requiresExecutionTimeRevalidation` | Always `true` |

Example action keys:

- `review-application`
- `request-additional-information`
- `complete-workflow-step`
- `create-referral`
- `review-evidence`
- `prepare-decision`
- `approve-decision` / `refuse-decision` (only when authority evaluation returns `ALLOW`)
- `issue-instrument` (only when issuance requirements met)
- `schedule-inspection` / `record-inspection`

**Critical:** The frontend must not render consequential actions as enabled when `available: false`. Execution endpoints (e.g. `POST /cases/:id/workflow/steps/:stepKey/complete`) **re-evaluate authority at execution time**.

### `GET /alerts`

Intelligence monitoring alerts where `responsibleRecipientIdentityId` matches the authenticated official.

## Scope resolution

Scope is derived from active appointments:

```
Identity → OfficeholderLink → Appointment → Office → Department → Institution
```

Case visibility rules (in order):

1. **ASSIGNED** — active `CaseAssignment` to this identity
2. **CASE_MANAGER** — `currentCaseManagerOfficeholderId` matches linked officeholder
3. **DEPARTMENT_POOL** — unassigned case in official's department
4. **DENIED** — all other cases (including cases assigned exclusively to another official)

## Consequential action evaluation

For consequential actions, `OfficialAvailableActionsService` calls `AuthorityEvaluationService.evaluate()` with:

- `identityId`, `officeholderId`, `officeId`, `appointmentId`, `delegationId`
- Mapped `AuthorityActionType`
- `priorActions` for SoD checks (e.g. approve after prepare)
- `hasSecondApproval` context

Outcomes:

- `ALLOW` → `available: true`
- Any other outcome → `available: false` with safe `unavailableReason`

Suspended functions, expired delegations, SoD conflicts, and missing second approval are reflected in availability without exposing governing-source details.

## Frontend integration contract

A future HeartStone government-official web frontend should:

1. **Bootstrap** with `GET /me` to render institutional context and capability flags
2. **Dashboard** from `GET /workspace` for summary cards/widgets
3. **Work list** from `GET /work-queue` for prioritized task inbox
4. **Case navigation** via `GET /cases` and `GET /cases/:id`
5. **Action buttons** driven exclusively by `GET /cases/:id/available-actions`
6. **Execute actions** via the `executionRoute` domain endpoints, never via experience endpoints
7. **Never infer authority** from assignment, role labels, or dashboard counts
8. **Treat `available: false`** as a hard UI disable with optional `unavailableReason` tooltip

## Relationship to other domains

| Domain | Relationship |
|--------|--------------|
| `src/identity/` | Session authentication, officeholder links |
| `src/government/` | Appointments, delegations, structure |
| `src/authority/` | Consequential action evaluation |
| `src/application-processing/` | Cases, workflow, assignments |
| `src/intelligence/` | Monitoring alerts |
| `src/redress/` | Review assignments |
| `src/instruments/` | Expiring instrument renewals |

## Testing expectations

E2E tests in `test/official-experience.e2e-spec.ts` verify:

- Citizens cannot access official workspace
- Officials without active appointments cannot access substantive endpoints
- Department scope filtering
- Case assignment restrictions
- Suspended authority removes actions
- Expired delegation removes actions
- SoD / second approval reflected in availability
- Execution-time authority revalidation remains required
- Service identities blocked
- Technical admins without institutional appointment blocked
