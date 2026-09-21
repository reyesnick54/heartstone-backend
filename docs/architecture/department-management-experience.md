# Department Management Experience API

HeartStone's Department Management Experience API provides a **governed operational management console** for department leadership. It aggregates workload, service delivery, officer activity, SLA risk, inspections, compliance matters, appeals, dependencies, and departmental health.

This API is intentionally distinct from:

| Experience | Purpose |
|---|---|
| **Official Workspace** (`/experience/official`) | Individual official case work and queue |
| **Executive Command Center** (`/intelligence/command-console`) | Institution-wide executive intelligence dashboards |
| **Technical platform administration** | Configuration and platform operations |

## Architectural invariants

| Concept | Meaning in this API |
|---|---|
| **User** | Authenticated identity (session) |
| **Officeholder / Appointment** | Institutional relationship facts |
| **Department membership** | Appointment-derived relationship to a department |
| **Management policy** | Configured `DashboardAccessPolicy` with `DEPARTMENT_MANAGEMENT` purpose |
| **Authority** | Never inferred from dashboard visibility |

**Department membership alone does not grant department-head management rights.** Substantive management endpoints require a configured management access policy for the requested department.

**Dashboard visibility does not create authority.** All aggregate responses include explicit disclaimers and never execute consequential actions.

**Aggregate views do not create case disposition.** Counts and summaries are read-only operational projections.

**Alerts are not enforcement findings.** Operational alerts surface verified or relevant warnings only.

## Module location

```
src/experience/
  department/
    department.module.ts
    department.controller.ts
    services/
      department-access.service.ts
      department-home.service.ts
      ...
```

Registered via `DepartmentModule` inside `ExperienceModule`.

## Authentication

All endpoints use canonical server-derived **`ActorContext`** via `@CurrentActor()`, populated by the global `SessionAuthGuard`. Clients must not supply acting identity fields in request payloads.

## Access control

`DepartmentAccessService` enforces:

1. Actor is not a `SERVICE` identity
2. Actor has institutional relationships (officeholder link / appointment / delegation)
3. Actor has an active appointment in the requested department (institutional relationship)
4. Actor has a matching `DashboardAccessPolicy` with:
   - `purpose = DEPARTMENT_MANAGEMENT`
   - `substantiveAccessRequired = true`
   - `departmentId` matching the requested department
   - no technical-only permission substitution

| Endpoint tier | Requirement |
|---|---|
| `GET /me` | Institutional actor (officeholder relationship) |
| All `/:departmentId/*` endpoints | Institutional relationship **and** configured management policy |

## Endpoints

Base path: `/api/v1/experience/department`

| Method | Path | Description |
|---|---|---|
| GET | `/me` | Identity summary and departments with management access flags |
| GET | `/:departmentId/home` | Aggregated department management dashboard |
| GET | `/:departmentId/workload` | Workload counts and officer distribution |
| GET | `/:departmentId/services` | Government services portfolio for the department |
| GET | `/:departmentId/cases` | Department case portfolio (management view) |
| GET | `/:departmentId/officers` | Officer workload without private HR fields |
| GET | `/:departmentId/sla` | Authoritative SLA clocks and milestone risk |
| GET | `/:departmentId/compliance` | Compliance matters and corrective action counts |
| GET | `/:departmentId/appeals` | Active appeals linked to department cases |
| GET | `/:departmentId/dependencies` | Pending referrals and external dependencies |
| GET | `/:departmentId/alerts` | Verified operational alerts |

## Home dashboard aggregates

The home endpoint aggregates:

- applications received
- open / completed cases
- cases awaiting review, applicant action, or external dependency
- decision-ready cases
- SLA approaching / overdue cases
- unassigned workload and officer distribution
- inspection backlog
- compliance matters and corrective actions
- active appeals
- expiring licenses/permits
- service availability and suspended services
- integration issues
- departmental alerts
- metrics freshness / staleness markers

## Data sources

| View | Authoritative sources |
|---|---|
| Workload / cases | `Case`, `CaseAssignment`, workflow step instances |
| Services | `GovernmentService`, `GovernmentServiceVersion` |
| SLA | `CaseSlaClock`, `CaseMilestone` |
| Compliance | `ComplianceMatter`, `ComplianceStatusProjection`, `ContinuingObligation` |
| Appeals | `RedressMatter` (via department cases) |
| Dependencies | `CaseReferral`, `ExternalDependencyDetermination` |
| Alerts | Service suspension, integration outages, SLA/backlog thresholds, compliance alerts, stale indicator projections |
| Access policy | `DashboardAccessPolicy` (`DEPARTMENT_MANAGEMENT`) |

## Staleness and data quality

Responses include `metricsFreshness` with `calculatedAt`, `staleAfter`, `isStale`, and an explicit stale-data disclaimer. Stale cached values remain visible but are never presented as live data.

## Testing

Mandatory e2e coverage lives in `test/department-experience.e2e-spec.ts`:

- ordinary citizen denied
- unrelated department denied
- membership alone denied without management policy
- cross-department access denied without policy
- stale metrics labeled
- aggregate/authority boundary flags
- restricted records scoped
- deterministic workload counts
- suspended service representation

Unit tests for access evaluation: `src/experience/department/services/department-access.service.spec.ts`.
