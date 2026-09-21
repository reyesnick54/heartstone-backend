# Service Pack Compiler / Validation Engine

## Objective

Take a validated ServicePack manifest and determine whether it can safely map to existing HeartStone government domains before any persistent operational deployment occurs.

Compilation is **dry-run only**. It does not mutate production configuration, create authority, or activate services.

## Canonical module

All service pack compiler logic lives under `src/service-catalog/service-pack/`.

| Component | Role |
|---|---|
| `ServicePackCompilerService` | Orchestrates dry-run compilation and produces immutable results |
| `ServicePackValidationService` | Runs structural and cross-domain validation checks |
| `ServicePackDependencyResolver` | Resolves manifest references against existing database entities |
| `ServicePackConflictDetector` | Detects slug collisions, fee conflicts, and output type conflicts |
| `ServicePackCompilationResult` | Immutable compilation report (via `buildServicePackCompilationResult`) |

## Compilation semantics

### Input

A `ServicePackManifest` (version `1.0`) containing:

- Pack identity (`packCode`, `packLabel`)
- Scope (`jurisdictionCode`, `institutionCode`)
- Proposed services with authority, governing source, form, workflow, fee, output, checklist, redress, integration, dashboard, and external authority references
- Optional embedded form and workflow definitions for structural validation

### Process

1. **Structure validation** — reject unsupported manifest versions, missing required fields, or forbidden bypass fields
2. **Dependency resolution** — read-only lookup of Jurisdiction, Institution, Department, FunctionAuthorityRecord, GoverningSource, FormDefinition, WorkflowDefinition, IntegrationDefinition, DashboardDefinition, and ExternalAuthority
3. **Conflict detection** — check code/slug uniqueness, fee definition conflicts, output type conflicts
4. **Domain validation** — run all 20 compilation checks (see below)
5. **Fingerprint generation** — compute deterministic SHA-256 hash of canonical manifest content
6. **Readiness assessment** — determine deployability with safe-halt on critical issues

### Output

An immutable `ServicePackCompilationResult` containing:

- `errors` and `warnings`
- `dependencies` and `unresolvedDependencies`
- `authorityIssues` and `configurationConflicts`
- Counts: `serviceCount`, `formCount`, `workflowCount`, `integrationCount`
- `readinessSummary` with `deployable` flag and optional `safeHaltReason`
- `configurationFingerprint` — deterministic hash for configuration pinning

### Safe-halt

Any unresolved critical authority or dependency condition results in a non-deployable compilation result (`deployable: false`). Critical check codes include:

- Referential integrity failures
- Department ownership violations
- Missing or inactive authority mappings
- Unauthenticated governing sources
- Invalid workflow graphs
- Invalid consequential action mappings
- Unavailable integration or external authority dependencies
- Cross-institution reference violations
- Activation bypass or authority creation attempts

## Compilation checks

| # | Check code | Description |
|---|---|---|
| 1 | `REFERENTIAL_INTEGRITY` | All referenced entities exist and are resolvable |
| 2 | `CODE_UNIQUENESS` | Service codes are unique within manifest and catalog |
| 3 | `SERVICE_SLUG_COLLISION` | Service slugs do not collide |
| 4 | `DEPARTMENT_OWNERSHIP` | Departments belong to the declared institution |
| 5 | `AUTHORITY_MAPPING_EXISTENCE` | Function authority mappings exist and are active |
| 6 | `GOVERNING_SOURCE_AUTHENTICATION` | Governing sources are authenticated |
| 7 | `FORM_FIELD_VALIDITY` | Form fields and conditional references are valid |
| 8 | `WORKFLOW_GRAPH_VALIDITY` | Workflow has valid entry points |
| 9 | `DEAD_WORKFLOW_STAGES` | No unreachable workflow steps |
| 10 | `MISSING_TRANSITIONS` | All transitions reference valid steps |
| 11 | `INVALID_CONSEQUENTIAL_ACTION_MAPPING` | Consequential steps map to active authority |
| 12 | `MISSING_EVIDENCE_REQUIREMENT_REFERENCES` | Checklist items reference declared evidence |
| 13 | `FEE_DEFINITION_CONFLICTS` | Fee codes and amounts are valid |
| 14 | `OUTPUT_TYPE_CONFLICTS` | Output types are consistent |
| 15 | `INTEGRATION_DEPENDENCY_AVAILABILITY` | Required integrations are active |
| 16 | `EXTERNAL_AUTHORITY_DEPENDENCIES` | External authorities are resolved |
| 17 | `REDRESS_ROUTE_COMPLETENESS` | Redress routes have contact or escalation |
| 18 | `SLA_CONFIGURATION_VALIDITY` | SLA target/warning days are valid |
| 19 | `UNSUPPORTED_DATA_CLASSIFICATIONS` | Only PUBLIC, INTERNAL, RESTRICTED allowed |
| 20 | `CROSS_INSTITUTION_REFERENCE` | Integrations/dashboards belong to institution |

Additional forbidden-field checks:

- `ACTIVATION_BYPASS_FORBIDDEN` — manifest must not include `bypassActivation`, `forceActivation`, `maturityStatus`, etc.
- `AUTHORITY_CREATION_FORBIDDEN` — manifest must not include `createAuthority` or `createFunctionAuthority`

## Configuration fingerprint

The configuration fingerprint is a SHA-256 hash of the canonical JSON representation of the manifest. Key properties:

- Deterministic: same manifest always produces the same hash
- Sensitive to changes: any modification to services, forms, or workflows changes the hash
- Used for configuration pinning alongside existing `buildServiceConfigurationFingerprint`

## Explicit exclusions

The compiler does NOT:

- Create or update GovernmentService, GovernmentServiceVersion, or any domain entity
- Activate, publish, or suspend services
- Create FunctionAuthorityRecord or GoverningSource
- Execute workflow steps or evaluate authority
- Deploy integrations or dashboards

## Tests

| Suite | Path | Coverage |
|---|---|---|
| Must-fail invariants | `src/service-catalog/service-pack/service-pack.must-fail.spec.ts` | All mandatory failure scenarios |
| Unit tests | `src/service-catalog/service-pack/service-pack-compiler.service.spec.ts` | Valid compilation, fingerprint, structure rejection |

## Integration

`ServicePackModule` is exported from `ServiceCatalogModule` for use by activation governance, experience orchestration, and future deployment pipelines.
