# Immigration, Residency & Citizenship Service Pack

## Objective

Provide a reusable **NON_PRODUCTION** HeartStone government vertical for immigration, residency, citizenship, appeals, and biometric/interview scheduling. The pack is declarative configuration only: it does not create verified legal authority, operational activation, or production eligibility rules.

## Pack identity

| Field | Value |
|---|---|
| `packId` | `non-production-immigration-residency-citizenship` |
| `packLabel` | `NON_PRODUCTION` |
| `serviceFamilyCode` | `NON_PRODUCTION-FAMILY-IMMIGRATION` |
| Institution / department codes | `NON_PRODUCTION-IMM`, `NON_PRODUCTION-IMM-OPS` |

Authoring source: `src/immigration/service-pack/immigration-government-service-pack.builder.ts`

On-disk manifest: `service-packs/templates/11-immigration-residency-citizenship.pack.json`

## Template services (12)

1. Visitor Visa Application  
2. Visa Extension  
3. Residency Application  
4. Residency Renewal  
5. Dependent Residency Application  
6. Long-Term Residency Application  
7. Work-Linked Residency Application  
8. Citizenship Application  
9. Citizenship Status / Certificate Request  
10. Immigration Status Correction / Review  
11. Immigration Appeal / Redress  
12. Biometric / Interview Appointment  

Each service declares NON_PRODUCTION placeholders for:

- Applicant categories  
- Forms and evidence (including passport/travel document and sponsor requirements)  
- Dependency checks and external coordination dependencies  
- Biometric and interview workflow stages where applicable  
- Fees, SLA rules, communications, integrations, dashboard indicators  
- Decision stages, issuance configuration, validity/renewal, and redress routes  

Authority function codes use canonical template placeholders such as `TEMPLATE-AUTH-IMMIGRATION-DECIDE` until a jurisdiction registers verified authority.

## Experience projections

### Citizen (`/api/v1/experience/citizen/immigration`)

| Route | Purpose |
|---|---|
| `GET /` | Overview counts and NON_PRODUCTION disclaimer |
| `GET /status` | Applicant-safe status, requests, appointments, fees, appeals |
| `GET /applications` | Scoped immigration applications |
| `GET /credentials` | Issued immigration credentials with renewal hints |
| `GET /actions` | Safe applicant actions (no status mutation or self-issuance) |

Citizen responses pass through `ImmigrationExperienceBoundaryService`, which strips classified external check fields and replaces restricted external dependency details with public coordination labels.

### Official (`/api/v1/experience/official/immigration`)

| Route | Purpose |
|---|---|
| `GET /workspace` | Intake, review, external dependency, interview/biometric, decision-ready, expiring permits, appeals, SLA risk |
| `GET /cases/:id/available-actions` | Server-evaluated actions (evidence, interview scheduling, external reference, prepare/decide/issue) |

Decision and issuance actions re-use the authority evaluation engine. Unresolved blocking dependencies (for example retained national / external determinations) deny `decide` even when review actions remain available.

## Module layout

```
src/immigration/
  immigration.constants.ts
  immigration.module.ts
  boundary/
  service-pack/
  experience/
```

`ImmigrationModule` is imported by `AppModule` and depends on citizen access, official scope, and authority evaluation services.

## Security invariants

- Applicant experience never exposes classified external check results.  
- Applicants cannot mutate immigration status or self-issue residence permits through experience actions.  
- Officials without decision authority cannot receive an available `decide` action.  
- Blocking external dependencies prevent decision actions until satisfied.  
- Issued credentials remain linked to `GovernmentDecision` records; redress matters do not overwrite original decisions.  
- Representative scope follows existing citizen access rules (direct applicant or active representative authority).

## Validation

```bash
npm run service-pack:validate -- service-packs/templates/11-immigration-residency-citizenship.pack.json
npm run test:unit -- --testPathPattern=immigration
npm run test:integration -- --testPathPattern=immigration-service-pack
```

## Deployment note

Pack validation and experience projections do **not** deploy services or activate authority. Institutional acceptance, deployment bindings, and operational activation follow the governed lifecycle documented in `service-pack-deployment-lifecycle.md`.
