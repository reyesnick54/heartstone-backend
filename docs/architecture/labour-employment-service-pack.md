# Labour, Employment & Work Permit Service Pack

HeartStone provides labour, employment, and work permit administration through a governed **service pack** plus a dedicated **`src/labour`** domain. Workers and citizens, employers, and officials use **experience APIs**; consequential decisions remain authority-governed. All template rules stay **`NON_PRODUCTION`**.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Labour authorization** | Work permit / employment authorization recorded in `WorkPermitAuthorization` |
| **Immigration authorization** | Coordinated via `LabourImmigrationAuthorizationCoordination` — separate status channel |
| **Residency** | Not created by work permit approval (`doesNotCreateResidency`) |
| **Corporate registry / identity** | Reused via dependencies; not duplicated in labour domain |

Labour authorization and immigration authorization **must not** collapse into a single status label in experience projections.

## Service pack

- Manifest id: `template-labour-employment-work-permit`
- On-disk template: `service-packs/templates/12-labour-employment-work-permit.pack.json`
- Authoring source: `src/service-catalog/service-packs/labour-employment-work-permit.template.ts`
- **16 NON_PRODUCTION template services** covering employer registration, employment relationships, declarations, work permits, sponsorship, workforce reporting, qualifications, inspections, complaints, disputes, compliance, and appeals
- Jurisdiction-bound placeholder forms, evidence, workflows, SLAs, integrations (including immigration coordination), and dashboard indicators

Validation uses `validateServicePackManifest`.

## Domain module (`src/labour`)

- **Worker profiles**: `LabourWorkerProfile` (identity-linked)
- **Employers**: `EmployerRegistration` (organization-linked)
- **Relationships**: `EmploymentRelationship` with configurable employer access scope JSON
- **Applications**: `WorkPermitApplicationProfile` (`doesNotIssuePermit`)
- **Authorizations**: `WorkPermitAuthorization` with separate labour/immigration channel statuses
- **Coordination**: `LabourImmigrationAuthorizationCoordination`
- **Complaints / disputes / inspections / declarations / compliance** domain records
- **Access audit**: `LabourAccessAudit`

Boundary services enforce cross-worker denial, employer scope, authority evaluation for permit decisions, AI exclusion, complaint-not-violation, and inspection outcome preservation.

## Experience APIs

### Citizen / worker

- `GET /experience/citizen/employment`
- `GET /experience/citizen/employment/relationships`
- `GET /experience/citizen/employment/work-permits`
- `GET /experience/citizen/employment/applications`
- `GET /experience/citizen/employment/actions`

Projections expose coordinated labour/immigration status labels where linked, without inventing obligations absent from configuration.

### Business / employer

- `GET /experience/business/organizations/:organizationId/workforce`
- `GET /experience/business/organizations/:organizationId/workforce/employees`
- `GET /experience/business/organizations/:organizationId/workforce/work-permits`
- `GET /experience/business/organizations/:organizationId/workforce/declarations`
- `GET /experience/business/organizations/:organizationId/workforce/compliance`
- `GET /experience/business/organizations/:organizationId/workforce/actions`

Requires organization membership or representative authority; worker detail access requires active employment relationship and configured scope.

### Official labour workspace

- `GET /experience/official/labour/workspace`
- `GET /experience/official/labour/dashboard`
- `GET /experience/official/labour/work-permits/:id/available-actions`

Queues cover employer registration, work permits, labour-market dependencies, qualifications, workforce declarations, inspections, corrective actions, complaints, disputes, renewals, expirations, and SLA risk. Dashboard indicators apply small-population suppression where configured.

Available consequential actions are evaluated with the authority engine at execution time; discovery alone does not grant approval power.

## Testing

- Service pack: `src/service-catalog/service-packs/labour-employment-work-permit.template.spec.ts`
- Schema guard: `src/labour/labour-schema.spec.ts`
- Domain invariants: `src/labour/labour-invariants.spec.ts`
- Must-fail gates: `src/labour/labour.must-fail.spec.ts`
- Integration: `test/labour-employment-service-pack.integration-spec.ts`

Mandatory invariants covered include pack validation, NON_PRODUCTION labeling, access boundaries, authority-gated permit decisions, immigration/labour separation, complaint/inspection rules, AI exclusion, and representative/employer scope enforcement.
