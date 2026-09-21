# Executive Government Experience API

HeartStone's Executive Government Experience API provides **authorized national and institutional leadership** with a governed strategic view across government operations. It is a read-only Backend-for-Frontend (BFF) orchestration layer — not a command console and not an authority pathway.

## Architectural invariants

| Concept | Meaning in this API |
|---------|---------------------|
| **Executive dashboard** | Informational visibility for leadership briefing |
| **Command authority** | Evaluated separately via governed authority pathways |
| **Metric** | Derived operational projection; not a verified legal fact |
| **Projection** | Point-in-time analytical view; not a guarantee |
| **Risk score** | Advisory assessment; not a sanction or enforcement decision |
| **Reported milestone** | Self-reported or submitted progress; not verified achievement |
| **AI alert** | Monitoring signal requiring human verification; not a confirmed violation |

**Critical boundaries preserved:**

- Executive dashboard != command authority
- Visibility != authority
- Metric != verified legal fact
- Projection != guarantee
- Risk score != sanction
- Reported project milestone != verified milestone
- AI recommendation != decision

This API **does not** expose endpoints to approve arbitrary cases, override departments, waive requirements, or force issuance.

## Module location

```
src/experience/
  executive/
    executive.module.ts
    executive.controller.ts
    guards/executive-experience.guard.ts
    services/
      executive-context.service.ts
      executive-indicator.service.ts
      executive-briefing.service.ts
    dto/
    types/
```

Registered in `ExperienceModule`.

## Authentication and access control

All endpoints require `SessionAuthGuard` (Bearer token) and `ExecutiveExperienceGuard`.

Access is derived from **server-side `ActorContext`** plus **`DashboardAccessPolicy`** records:

1. Identity must not be `SERVICE` / AI automation
2. Identity must have a substantive `EXECUTIVE_BRIEFING` policy on an `EXECUTIVE_COMMAND` dashboard
3. Technical-only dashboard policies (`TECHNICAL_OPERATIONS`) do **not** confer substantive executive access
4. Departmental dashboard access does **not** imply executive access
5. Cross-institution visibility requires explicit policy entitlement for that institution

Client-supplied identity or institutional identifiers are never trusted.

## Endpoints

Base path: `/api/v1/experience/executive`

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/home` | Aggregated executive briefing across all domains |
| `GET` | `/government-operations` | Cases, applications, SLA, department workload |
| `GET` | `/services` | Active/suspended government services and usage indicators |
| `GET` | `/departments` | Department workload summaries |
| `GET` | `/investment` | Strategic projects, capital, employment evidence |
| `GET` | `/projects` | Strategic project portfolio with dependency/risk signals |
| `GET` | `/compliance` | Compliance oversight aggregates and indicators |
| `GET` | `/redress` | Appeals and redress backlog |
| `GET` | `/digital-government` | Service health, integration, security, production readiness |
| `GET` | `/risk` | Operational, dependency, and data-quality risk signals |
| `GET` | `/alerts` | Intelligence monitoring alerts with verification status |

All endpoints are **read-only**. No consequential mutations are performed.

## Data sources (orchestrated, not duplicated)

| Domain service | Used for |
|----------------|----------|
| `DashboardQueryService` | Executive command console indicator projections |
| `DashboardAccessPolicyService` | Access evaluation and audit trail |
| `ComplianceDashboardService.getExecutiveAggregate()` | Compliance oversight aggregates |
| `StrategicProjectProfile` + related records | Investment/project portfolio |
| Case/application/SLA queries | Government operations summaries |
| `IntelligenceMonitoringAlert` | Executive alerts panel |
| Production readiness / continuity records | Digital government signals |

Analytics models and dashboard projection schemas are **not duplicated** in this module.

## Executive home composition

`GET /home` aggregates:

**Government Operations:** applications received, open/completed/overdue cases, processing times where supported, SLA performance, service usage indicators, department workload, active services.

**Economy / Investment:** active projects, strategic project count, reported capital values, verified vs reported milestones (separately identified), employment evidence, dependencies, projects at risk.

**Compliance:** inspections overdue, unresolved corrective actions, serious compliance matters, expiring regulated instruments, appeals/redress backlog.

**Digital Government:** active/suspended services, service health indicators, integration outages, identity/security anomalies, AI agent counts, production readiness issues, continuity issues.

**Risk:** operational risk indicators, dependency risk, data quality issues, stale analytics, unresolved external-national determinations, cybersecurity/readiness conditions.

Each section includes explicit disclaimers and stale-data flags where applicable.

## Relationship to command console

The Phase 12B intelligence command console (`POST /intelligence/command-console/executive/query`) remains the low-level projection query API. The Executive Experience API provides a **frontend-ready, domain-organized BFF** that:

- Uses the same access policies and actor context
- Organizes indicators into leadership-facing sections
- Enriches with domain summaries (cases, projects, compliance, alerts)
- Applies consistent boundary disclaimers across all responses

## Testing expectations

Integration tests in `test/executive-experience.integration-spec.ts` verify:

- Citizens denied
- Ordinary officers denied unless explicitly entitled
- Departmental dashboard access does not imply executive access
- Executive visibility does not alter cases
- Stale projections flagged
- Reported milestones not displayed as verified
- Risk scores not displayed as sanctions
- AI alerts not displayed as confirmed violations without verification
- Technical administrators denied substantive executive access
- No override/approval endpoints exposed
