# Planning, Development & Construction Service Pack

HeartStone provides planning, development, permitting, and construction oversight through a governed **service pack** plus the **`src/planning-construction`** domain. Citizens, businesses, officials, and department leadership use **experience APIs** for a unified **Development Portal**; jurisdiction-specific rules remain **`NON_PRODUCTION`** template placeholders until institutionally configured.

## Separation of concerns

| Concern                    | Meaning                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| **Portal projection**      | Read models for applicants and investors; not permit issuance               |
| **Fee payment**            | Financial settlement only; does not approve permits                         |
| **Permit issuance**        | Requires configured authority evaluation and resolved external dependencies |
| **Occupancy / completion** | Requires a recorded `GovernmentDecision` and authorized officeholder        |
| **Department metrics**     | Operational indicators only; not legal determinations                       |

## Service pack

- Manifest id: `template-planning-construction`
- On-disk template: `service-packs/templates/11-planning-construction-service-pack.pack.json`
- Authoring source: `src/service-catalog/service-packs/planning-construction-service-pack.template.ts`
- **15 NON_PRODUCTION template services** covering planning applications, zoning, permits, inspections, corrective actions, occupancy, and appeals
- Includes placeholder forms, evidence, workflows, fees, communications, integrations, and dashboard indicators

Validation uses the standard service-pack toolkit (`validateServicePackManifest`).

## Domain module (`src/planning-construction`)

- **Projects**: `DevelopmentProject` with site, applications, professionals, fees, dependencies, appeals
- **Permits**: versioned `DevelopmentPermit` / `DevelopmentPermitVersion` (amendments create new versions)
- **Inspections**: outcomes preserved; failed inspections cannot be overwritten without reinspection
- **External dependencies**: block permit decisions until resolved
- **Occupancy**: `DevelopmentOccupancyCertificate` linked to authoritative decisions
- **Access audit**: `DevelopmentAccessAudit` for applicant and organization scope enforcement

Administrative mutation paths enforce boundary services; experience APIs are read-oriented projections except governed workflow services invoked by officials.

## Experience APIs

### Citizen (individual applicants)

- `GET /experience/citizen/development-projects`
- `GET /experience/citizen/development-projects/:id`
- `GET /experience/citizen/development-actions`

Unified project view includes project, site, applications, permits, inspections, corrective actions, fees, dependencies, professionals, occupancy, appeals, and indicative deadlines.

### Business / investor

- `GET /experience/business/organizations/:organizationId/development-projects`
- `GET /experience/business/organizations/:organizationId/development-projects/:projectId`
- `GET /experience/business/organizations/:organizationId/development-projects/:projectId/permits`
- `GET /experience/business/organizations/:organizationId/development-projects/:projectId/inspections`
- `GET /experience/business/organizations/:organizationId/development-projects/:projectId/actions`

Requires active organization membership; projects are scoped to the organization.

### Official workspace

- `GET /experience/official/planning-construction/workspace`

Role-aware queue counts: planning intake, zoning reviews, technical reviews, professional-document reviews, external authority referrals, inspections, reinspection, permit decision-ready cases, occupancy certificate queue, appeals, and SLA risk.

### Department management

- `GET /experience/department/:departmentId/planning-construction`

Metrics: applications by type, permit backlog, inspection backlog, SLA risk, reinspection rate, unresolved dependencies, permits issued, occupancy certificates issued, active development projects — all labeled as non-determinative indicators.

## Testing

- Service pack: `src/service-catalog/service-packs/planning-construction-service-pack.template.spec.ts`
- Domain invariants: `src/planning-construction/planning-construction-invariants.spec.ts`
- Must-fail gates: `src/planning-construction/planning-construction.must-fail.spec.ts`
- Integration: `test/planning-construction-service-pack.integration-spec.ts`

Mandatory invariants covered: pack validation, NON_PRODUCTION labeling, applicant/professional self-issuance blocks, inspection failure preservation, external dependency enforcement, access isolation, occupancy governance, permit amendment versioning, payment ≠ approval, and authority configuration for permit issuance.
