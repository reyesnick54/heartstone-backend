# Service Pack Deployment Lifecycle

HeartStone Government Service Packs move compiled configuration into the platform through a governed deployment lifecycle that is distinct from service activation.

## Core invariant

**Deployment != Activation**

A successfully compiled and deployed service pack binds configuration into HeartStone without automatically activating included government services. Services remain non-public and operationally inactive until their existing institutional activation requirements are satisfied through governed domain services.

## Lifecycle states

### Service pack version

| State | Meaning |
| --- | --- |
| `COMPILED` | Pack artifact compiled with manifest and compilation fingerprint |
| `ACCEPTED` | Pack accepted for governed deployment into configuration |

### Service pack deployment

| State | Meaning |
| --- | --- |
| `DEPLOYMENT_READY` | Accepted pack staged for deployment without activation |
| `DEPLOYED` | Configuration bound into HeartStone domains; services not auto-activated |
| `OPERATIONALLY_INACTIVE` | Deployed pack blocked or partially blocked from activation |
| `ACTIVE` | Included services activated through governed domain activation services |
| `SUSPENDED` | Deployment suspended without erasing bound configuration history |
| `ROLLED_BACK` | Unactivated deployment configuration safely reversed |
| `SUPERSEDED` | Prior deployment replaced by explicit supersession semantics |

## Services

| Service | Responsibility |
| --- | --- |
| `ServicePackDeploymentService` | Accept compiled versions, mark deployment-ready, deploy configuration bindings |
| `ServicePackActivationService` | Coordinate readiness checks and delegate activation to `ServiceActivationService` |
| `ServicePackRollbackService` | Revert unactivated configuration; supersede active deployments without erasure |
| `ServicePackDeploymentAuditService` | Persist immutable deployment audit trail |

## Configuration binding domains

Deployment creates reversible bindings across:

- service catalog
- forms
- workflows
- service authority mappings
- fee metadata
- evidence requirements
- output metadata
- redress routes
- communication configuration
- integration references
- dashboard configuration

Bindings record domain entity identifiers, optional version labels, and snapshots. `isActivated` remains false until governed activation succeeds.

## Fingerprints

Each deployment records:

1. the exact `ServicePackVersion` used
2. a configuration fingerprint derived from the version label, compilation fingerprint, and bound domain entries

Fingerprints are persisted on the deployment and written to the audit trail via `FINGERPRINT_RECORDED` events.

## Activation governance

`ServicePackActivationService` may assess readiness but must not directly mutate raw lifecycle statuses. Activation delegates to existing governed services, especially:

- `ServiceActivationService` for `GovernmentServiceVersion` operational activation
- existing `FunctionAuthorityRecord` activation requirements
- integration acceptance records for referenced integrations

Activation is blocked when:

- a mapped authority is suspended
- declared dependencies remain unresolved
- required integration acceptance is missing

## Rollback and supersession

Rollback may remove only unactivated, reversible configuration bindings. It must not:

- delete official records
- delete applications or cases
- alter historical decisions
- delete issued instruments
- invalidate evidence history

Active deployments cannot be silently rolled back. Supersession marks the prior deployment `SUPERSEDED`, links to the successor deployment, and preserves historical service versions for existing applications and cases.

## Audit trail

`ServicePackDeploymentAuditRecord` captures deployment lifecycle events with prior and new status, actor identity, reason, and metadata such as fingerprints and delegated activation record identifiers.

## Module location

Implementation lives under `src/service-catalog/service-packs/` and is exported through `ServicePackDeploymentModule`.

## Schema

Prisma models:

- `ServicePack`
- `ServicePackVersion`
- `ServicePackDeployment`
- `ServicePackDeploymentBinding`
- `ServicePackDeploymentAuditRecord`

Migration: `prisma/migrations/20260921160000_service_pack_deployment_lifecycle/`
