# Service Pack Registry and Portability

HeartStone Government Service Packs are reusable **software architecture**, not reusable **legal authority**. The registry and portability layer tracks where packs are installed, which versions are active, and how sanitized configuration may move between environments or jurisdictions under explicit revalidation.

## Critical principle

| Reusable across jurisdictions | Never automatically transferable |
| --- | --- |
| Structural patterns | Governing sources |
| Generic forms | Authority assignments |
| Workflow architecture | Institutions and departments |
| Service categories | Officeholders |
| Technical schema | Fees and eligibility |
| | Evidence and retention rules |
| | Integrations and official outputs |
| | Redress routes and policy-derived SLAs |

Template clones retain structure. Target jurisdictions must rebind authority mappings and repeat institutional acceptance.

## Services

| Service | Responsibility |
| --- | --- |
| `ServicePackRegistryService` | Administrative registry views and pack summaries |
| `ServicePackInventoryService` | Deployment inventory facets (active, superseded, suspended, dependencies) |
| `ServicePackExportService` | Sanitized portable export for backup, audit, promotion, and template reuse |
| `ServicePackImportService` | Controlled import into `DRAFT_IMPORTED` safe state |
| `ServicePackJurisdictionBindingService` | Explicit jurisdiction binding and revalidation flags |
| `ServicePackTemplateCloneService` | Cross-jurisdiction template clone without inherited acceptance |
| `ServicePackUpgradePlanService` | Dry-run upgrade analysis (no mutation) |

## Registry inventory

`GET /service-packs/registry` and scoped variants return:

- installed packs
- active versions
- pending upgrades
- suspended packs
- superseded packs
- unresolved dependencies
- validation, acceptance, and deployment state

Registry entries include fingerprint, deployment environment reference, service counts, last validation/review timestamps, and responsible owner identity when configured.

## Export boundaries

Portable exports include configuration metadata only. Export sanitization removes or replaces:

- secrets and private encryption material
- production credentials and protected integration secrets
- citizen, case, evidence, decision, payment, and credential payloads

Secrets are represented by deterministic `REF:SECRET:*` references only. Institution-restricted packs require institutional actor scope unless export restriction is `TEMPLATE_PORTABLE`.

## Import and template clone safe states

Imported and template-cloned packs are persisted with:

- `ServicePackImportStatus.DRAFT_IMPORTED`
- `ServicePackManifestValidationStatus.DRAFT_IMPORTED`
- `ServicePackVersionStatus.COMPILED` (never auto-accepted)

Cross-jurisdiction template clones set jurisdiction bindings with authority revalidation required and rewrite authority mapping codes to `REVALIDATE:*` placeholders.

## Upgrade planning

`POST /service-packs/:id/versions/:versionId/upgrade-plan` returns a dry-run report covering affected services, workflows, forms, integrations, authority mappings, pinned historical cases, migration risks, rollback constraints, and required reviews. The endpoint does not deploy or mutate configuration.

## Historical continuity

Cases and applications remain pinned to the `governmentServiceVersionId` and configuration fingerprint captured at intake. Upgrade planning surfaces these pins; supersession does not rewrite historical records.
