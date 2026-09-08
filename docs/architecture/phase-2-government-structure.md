# Phase 2 — Government Structure

## Objective

Establish the institutional data model that HeartStone will use to represent a government before identity, authority enforcement, services, workflows, or case processing are added.

Phase 2 is structural. It does not grant legal authority and does not implement citizen authentication.

## Planned domain primitives

### Jurisdiction
Represents the territorial or subject-matter jurisdiction in which an institution operates.

### Institution
Represents a government, public authority, statutory body, special economic zone, ministry, agency, regulator, or other institutional entity.

### GovernmentBody
Represents a formally constituted governing, supervisory, advisory, administrative, or decision-making body associated with an Institution.

### Department
Represents an organizational department operating within an Institution.

### Office
Represents a defined institutional office or position. An Office exists independently of the person occupying it.

### Officeholder
Represents the institutional person-of-record occupying or acting in an Office. Phase 2 should not conflate this record with a login account.

### Appointment
Represents the documented relationship assigning an Officeholder to an Office for a bounded period and status.

### Delegation
Represents an explicit, bounded institutional delegation record. Phase 2 records the structural relationship only; later Authority Engine phases determine whether a delegation authorizes a specific consequential action.

### ExternalAuthority
Represents another competent government, regulatory, judicial, professional, or institutional authority with which HeartStone may later coordinate or route defined matters.

## Core relationships

```text
Jurisdiction
  -> Institution
      -> GovernmentBody
      -> Department
          -> Office
              -> Appointment
                  -> Officeholder

Institution / Office / Officeholder
  -> Delegation

Institution
  -> ExternalAuthority relationships
```

## Required invariants

1. A User is not an Officeholder merely because the user has a system account.
2. An Officeholder is not an Office; the office persists when personnel change.
3. An Appointment must have an explicit status and effective period.
4. A Delegation must identify its source, delegator, recipient, scope description, effective period, and status.
5. A Department belongs to an Institution and cannot silently move between institutions.
6. Institutional records should support active, suspended/inactive, and historical states without destructive deletion of material history.
7. Consequential government authority is not inferred from these structural records. Authority enforcement belongs to a later HeartStone phase.
8. Domain records should use stable identifiers and timestamps suitable for later audit/event integration.

## Phase 2 API direction

Use REST under `/api/v1` with thin controllers and service-layer business rules. The exact endpoint set should be introduced incrementally, one bounded entity group at a time.

Recommended implementation order:

1. Jurisdiction + Institution
2. GovernmentBody + Department
3. Office + Officeholder
4. Appointment
5. Delegation
6. ExternalAuthority
7. Cross-entity validation and integration tests
8. Seed data for a non-production sample government structure

## Explicit exclusions

Do not implement in Phase 2:

- citizen identity or login
- OAuth/OIDC or MFA
- role-based access control
- function-level Authority Engine evaluation
- government services catalog
- forms
- workflow orchestration
- cases
- evidence
- decisions or approvals
- licenses/permits issuance
- AI agents
- payments
- external government integrations

Those are later HeartStone phases.
