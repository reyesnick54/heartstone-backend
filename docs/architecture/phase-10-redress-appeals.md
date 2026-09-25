# Phase 10 — Redress and Appeals

## Phase 10F — Statutory and External Redress Pathways

HeartStone supports external and retained-authority redress without pretending to possess authority it does not have.

### Critical rule

HeartStone may:

- inform
- prepare
- transmit
- coordinate
- track
- receive
- authenticate
- record
- implement an external result where authorized

It must not pretend to adjudicate:

- national statutory appeals
- judicial review
- professional discipline
- external regulatory determinations
- other retained-authority review

unless exact configured authority supports it.

### Domain models

| Model | Purpose |
|-------|---------|
| `RedressMatter` | Matter container for redress coordination |
| `ExternalReviewReferral` | External review referral with standing, timeliness, grounds, and transmission metadata |
| `ExternalReviewPackage` | Version-pinned evidence package with deterministic manifest hash |
| `ExternalReviewAcknowledgment` | External authority acknowledgment |
| `ExternalReviewStatusRecord` | Authenticated status history |
| `ExternalReviewDetermination` | Received external determination with exact source wording |
| `ProfessionalChallengeReferral` | Professional body challenge route |
| `RegulatoryReviewReferral` | Regulator review route |
| `OmbudsOversightReferral` | Ombuds/oversight route (recommendatory by default) |
| `JudicialReviewInformationRecord` | Judicial route information only; not a court |

### Status lifecycle

`PREPARATION` → `READY_FOR_TRANSMISSION` → `TRANSMITTED` → `ACKNOWLEDGED` → `UNDER_EXTERNAL_REVIEW` → `EXTERNAL_DETERMINATION_RECEIVED` → `IMPLEMENTATION_PENDING` → `CLOSED`

Also: `FURTHER_INFORMATION_REQUESTED`, `HEARING_SCHEDULED`, `UNKNOWN`, `SAFE_HALTED`

Do not use `APPROVED` unless an authenticated determination actually says so.

### Package integrity

External review packages pin frozen `EvidencePacketVersion` records and generate deterministic manifest hashes using the Phase 7 canonical manifest approach. Documents are referenced, not duplicated.

### Boundary invariants

1. External appeal not internally adjudicated
2. National appeal authority preserved
3. Judicial route does not create internal court
4. Government silence not appeal success
5. Professional challenge remains professional
6. External recommendation distinguished from binding determination
7. Unauthenticated external determination not implemented
8. External record preserves exact source wording/reference
9. Referral package version pinned
10. Security classification preserved
11. AI cannot determine external outcome
12. Technical admin cannot fabricate external determination

### Canonical redress vs domain appeal references

`RedressMatter` in `src/redress/` is the only active redress/appeals coordination engine. Experience-layer “appeals” views (citizen home counts, department appeals dashboards) query `RedressMatter` via shared `ACTIVE_REDRESS_MATTER_STATUSES` in `src/redress/common/active-redress-matter-statuses.constants.ts`.

Domain modules may maintain appeal **reference** records (for example social protection benefit appeals, development planning appeals) that link to `RedressMatter` and pin original decision versions. Those references must not mutate or replace `GovernmentDecision` history.

### API surface

Module: `src/redress/`

- `GET /redress/boundary`
- `POST /redress/matters`
- `GET /redress/matters/:id`
- `POST /redress/external-referrals`
- `GET /redress/external-referrals/:id`
- `POST /redress/external-referrals/:id/packages`
- `POST /redress/external-referrals/:id/determinations`

Stop before Phase 10G.
