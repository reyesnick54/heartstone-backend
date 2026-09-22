# Public Safety & Emergency Government Service Pack

HeartStone provides public safety and emergency government services through a governed **service pack** plus the **`src/public-safety`** domain. Citizens and businesses use dedicated experience APIs; authorized officials, department managers, and executive leadership use separate **informational** projections. All template rules remain **`NON_PRODUCTION`**. The pack does **not** create jurisdiction-specific emergency powers.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Incident report** | Submitted report with explicit verification state (`UNVERIFIED` until officially verified) |
| **Recovery assistance** | Separate application track; not merged into incident reports |
| **Emergency event projection** | Operational monitoring summary; **not** an emergency declaration |
| **Official notice** | Draft → approved → published lifecycle; only published content is public |

Dashboards, queues, and executive aggregates **do not** issue alerts, declarations, enforcement findings, or operational commands.

## Service pack

- Manifest id: `template-public-safety-emergency`
- On-disk template: `service-packs/templates/12-public-safety-emergency.pack.json`
- Authoring source: `src/service-catalog/service-packs/public-safety-service-pack.template.ts`
- **12 NON_PRODUCTION template services**:
  1. Submit Public Safety Incident Report
  2. Request Emergency Government Assistance
  3. Disaster Impact Report
  4. Disaster Relief Intake
  5. Public Safety Permit Application
  6. Fire Safety Inspection Request
  7. Emergency Inspection Request
  8. Emergency Document Replacement Request
  9. Infrastructure Disruption Report
  10. Emergency Shelter / Assistance Information
  11. Recovery Assistance Application
  12. Public Safety Decision Review / Appeal

Validation uses the standard service-pack toolkit (`validateServicePackManifest`).

## Domain module (`src/public-safety`)

- **Engagements**: `PublicSafetyEngagement` (citizen reporter or business organization scope)
- **Service requests**: `PublicSafetyServiceRequest` aligned to template service codes
- **Incident reports**: `PublicSafetyIncidentReport` with verification status and reporter privacy flags
- **Recovery**: `PublicSafetyRecoveryAssistanceApplication` (separate table and projections)
- **Emergency events**: `PublicSafetyEmergencyEvent` (`isOfficialDeclaration` remains false by default)
- **Official notices**: `PublicSafetyOfficialNotice` with draft / approved / published separation
- **Inspections & dependencies**: inspection backlog and external dependency tracking for department metrics

## Citizen experience

- `GET /experience/citizen/public-safety`
- `GET /experience/citizen/public-safety/reports`
- `GET /experience/citizen/public-safety/emergency-events`
- `GET /experience/citizen/public-safety/assistance`
- `GET /experience/citizen/public-safety/actions`

Citizens **cannot** issue public emergency alerts or publish official notices through these endpoints.

## Business experience

- `GET /experience/business/organizations/:organizationId/public-safety`
- `GET /experience/business/organizations/:organizationId/public-safety/records`

Supports business incident reports, emergency permits, fire-safety inspections, facility-impact reports, and recovery applications within organization membership scope.

## Official workspace

- `GET /experience/official/public-safety/workspace`

Queues: incoming reports, verification, referrals, emergency assistance, inspections, recovery assistance, government communications, external authority coordination, SLA/priority escalation.

## Department management

- `GET /experience/department/:departmentId/public-safety`

Metrics: open/verified/pending incidents, assistance requests, inspection backlog, response-state counts, communication delivery status, external dependency status.

## Executive experience

- `GET /experience/executive/public-safety`

Aggregates active emergency events, service interruptions, verified impact summaries, assistance demand, dependency status, communications status, and recovery program metrics. **Read-only** — does not mutate incident state.

## Public notifications

- Published notices: `GET /public/public-safety/notices/:noticeReference`
- Draft and approved-not-yet-published content is not exposed on public routes
- Only authorized officials may approve/publish consequential notices (see `PublicSafetyNoticeService`)

## Testing

- Service pack: `src/service-catalog/service-packs/public-safety-service-pack.template.spec.ts`
- Domain invariants: `src/public-safety/public-safety-invariants.spec.ts`
- Must-fail gates: `src/public-safety/public-safety.must-fail.spec.ts`
- Integration: `test/public-safety-service-pack.integration-spec.ts`

Mandatory invariants covered: pack validation, NON_PRODUCTION labeling, unverified report labeling, reporter privacy, citizen alert prohibition, unauthorized notice publish, platform admin emergency authority prohibition, executive read-only aggregates, AI declaration prohibition, business scope boundaries, published-notice content boundary, recovery/incident separation.
