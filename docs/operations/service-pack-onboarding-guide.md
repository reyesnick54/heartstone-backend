# How to Onboard a New Ministry, Department, or Government Service into HeartStone

This guide describes the canonical workflow for configuring new government departments and service families using the HeartStone Service-Pack authoring toolkit.

**All template and example manifests are NON_PRODUCTION / TEMPLATE ONLY.** They demonstrate architecture only — not verified law, policy, or production authority assignments.

## Prerequisites

- Phase 2 government structure exists (jurisdiction, institution, department, office).
- Phase 4 authority functions are registered and activated for consequential actions.
- Service catalog module is available under `src/service-catalog/`.
- Implementation team has access to the `service-packs/` authoring directory.

## Workflow overview

```mermaid
flowchart LR
  A[Author Manifest] --> B[Validate]
  B --> C[Compile]
  C --> D[Review]
  D --> E[Institutional Acceptance]
  E --> F[Deploy]
  F --> G[Domain Readiness]
  G --> H[Activation]
  H --> I[Monitor]
  I --> J[Supersede]
```

| Stage | Actor | Outcome |
|---|---|---|
| **Author Manifest** | Implementation team | Draft JSON manifest describing services, forms, workflow, authority bindings |
| **Validate** | Toolkit / CI | Schema, authority registry, and governance checks pass |
| **Compile** | Toolkit | Deterministic fingerprint and dependency report generated |
| **Review** | Domain owner + security | High-risk diffs flagged; no auto-approval |
| **Institutional Acceptance** | Authorized officeholder | Recorded acceptance distinct from technical readiness |
| **Deploy** | Operations | Manifest provisions catalog records via governed import |
| **Domain Readiness** | Service owner | Readiness checks against institution, authority, forms |
| **Activation** | `ServiceActivationService` | Operational activation after acceptance — never via manifest bypass |
| **Monitor** | Operations + service owner | Dashboard indicators, SLA clocks, suspension triggers |
| **Supersede** | Governed supersession | New version replaces prior; fingerprint pinning enforced |

## Step 1 — Author Manifest

1. Choose the closest canonical template from `service-packs/templates/`:
   - Simple registration
   - License / permit
   - Renewal
   - Inspection-dependent
   - External-authority-dependent
   - Professional review
   - Multi-department workflow
   - Benefit / entitlement
   - Business / investor
   - High-sensitivity

2. Copy the template to a new pack file (keep `packLabel: TEMPLATE_ONLY` or `NON_PRODUCTION` until institutionally accepted).

3. Configure:
   - **Service identity** — `serviceCode`, `serviceSlug`, `serviceName`
   - **Service family** — `serviceFamilyCode`
   - **Applicant categories** — from catalog enum
   - **Authority function references** — by `functionCode`, never embedded permissions
   - **Forms** — sections and fields with data classification
   - **Evidence requirements** — codes, verification categories, retention policies
   - **Workflow stages** — ordered steps with authority bindings
   - **Completeness review** — required evidence for intake gate
   - **SLA rules** — target days and clock start stage
   - **Fees** — metadata only; payment execution is a later phase
   - **Outputs** — expected output definitions; does not issue instruments
   - **Communications** — trigger stage and template codes
   - **Dependencies** — internal departments, external integrations
   - **Decision stages** — decision actor function codes
   - **Issuance** — issuance stage and output codes
   - **Lifecycle / renewal** — validity and renewal service references
   - **Redress** — complaint and appeal route metadata
   - **Dashboard indicators** — operational monitoring metrics

4. Keep `deploymentIntent` at draft / non-operational values. Never declare `ACTIVE` maturity or application-capable availability in authoring manifests.

## Step 2 — Validate

```bash
npm run service-pack:validate -- path/to/your-service-pack.pack.json
```

Validation checks:

- NON_PRODUCTION / TEMPLATE ONLY labeling
- No activation governance bypass fields
- Registered authority function codes
- Structural integrity (forms, workflow, applicant categories)
- Completeness review configuration

Invalid authority mappings are rejected. Templates cannot bypass activation governance.

## Step 3 — Compile

```bash
npm run service-pack:compile -- path/to/your-service-pack.pack.json
```

Compilation produces:

- Deterministic SHA-256 fingerprint
- Dependency report (authority functions, integrations, forms, evidence)
- Human-readable summary for reviewers
- Per-service counts for workflow, evidence, and authority mappings

Store the fingerprint for version pinning and supersession tracking.

## Step 4 — Review

Before institutional acceptance, run diff against the prior approved version:

```bash
npm run service-pack:diff -- prior.pack.json proposed.pack.json
```

High-risk changes requiring institutional review (never auto-approved):

- New authority function
- Change to decision actor
- Removed evidence requirement
- Reduced review gate
- New external integration
- New sensitive data field
- Changed retention behavior
- Changed fee
- Changed eligibility rule
- Service removal

## Step 5 — Institutional Acceptance

Institutional acceptance is distinct from:

- CI success
- Technical test readiness
- Pilot success

An authorized officeholder must record acceptance with explicit scope, residual risks, and validity period. See [institutional-acceptance.md](./institutional-acceptance.md).

## Step 6 — Deploy

Provision catalog records from the validated manifest through governed import paths under `src/service-catalog/`. The import must:

- Reference authority by code and resolve to active `FunctionAuthorityRecord` rows
- Create or update `GovernmentService`, `GovernmentServiceVersion`, forms, mappings, and metadata
- Leave maturity at `DRAFT` or `CONFIGURED` until readiness and acceptance complete

## Step 7 — Domain Readiness

Run service readiness assessment (`ServiceReadinessService`) covering:

- Institution and department ownership
- Active authority mappings
- Published form versions
- Integration connectivity for declared dependencies

## Step 8 — Activation

Operational activation occurs only through `ServiceActivationService`:

1. Institutional acceptance recorded
2. Authority evaluation passes
3. Operational activation invoked by identified institutional actor

Manifests cannot set `maturityStatus: ACTIVE` or `publicAvailability: ACTIVE` directly.

## Step 9 — Monitor

Use dashboard indicators declared in the pack plus operational SLA clocks at case runtime. Suspend services through governed suspension when required.

## Step 10 — Supersede

When publishing a new version:

1. Author and validate the new manifest
2. Diff against the active version; resolve all flagged high-risk changes through institutional review
3. Record supersession through `ServiceActivationService`
4. Publish new fingerprint; stale fingerprints return `409 VERSION_SUPERSEDED` on citizen start paths

## Reference commands

| Command | Purpose |
|---|---|
| `npm run service-pack:validate` | Schema and governance validation |
| `npm run service-pack:format` | Deterministic manifest formatting |
| `npm run service-pack:fingerprint` | Fingerprint only |
| `npm run service-pack:compile` | Full compilation report |
| `npm run service-pack:diff` | Version diff with high-risk flags |
| `npm run service-pack:compare` | Diff plus fingerprint comparison |
| `npm run service-pack:deps` | Dependency report only |
| `npm run service-pack:write-templates` | Regenerate canonical templates |

## Architecture invariants

- User ≠ Officeholder ≠ Role ≠ Permission ≠ Authority
- Service packs configure catalog metadata; they do not create applications, cases, decisions, or issued instruments
- Eligibility guidance is non-binding; outputs do not issue instruments
- Authority evaluation does not create authority
- AI assistance does not equal an official decision
