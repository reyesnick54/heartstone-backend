# Phase 8 — Government Decisions, Issuance & Official Instrument Lifecycle

## Objective

Record final government decisions, assess issuance readiness, issue official instruments, and manage post-issuance instrument states — while preserving strict institutional distinctions between preparatory work and consequential government action.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Recommendation** | What does an official or expert advise? (not a final decision) |
| **AI assistance** | What support was provided to a human actor? (not a decision-maker) |
| **Decision catalog (Phase 8A/8B)** | What decision routes and permissible outcomes exist? (not a decision record) |
| **Evidence packet (Phase 7E)** | What evidence was frozen for decision support? (not a decision) |
| **Decision readiness** | Is the case ready for an authorized decision? (not a decision) |
| **Decision preparation** | What draft findings or recommendations exist? (not a final decision) |
| **GovernmentDecision** | What final institutional outcome was recorded? |
| **Document signature / seal status** | Are referenced document versions signed or sealed? |
| **Issuance readiness** | Are precedent conditions, signatures, seals, and catalog rules satisfied? |
| **OfficialInstrument** | What instrument was issued and what is its current lifecycle status? |
| **Case status DECIDED / ISSUED** | What is the case-level consequence state after Phase 8 transitions? |

## Canonical modules

Phase 8 is implemented across two cooperating modules:

- `src/decisions/` — decision catalog consumption, readiness assessment, non-final preparation, and authorized decision execution (Phase 8B)
- `src/decisions-issuance/` — instrument catalog, issuance readiness, controlled issuance, and instrument lifecycle states (Phase 8E)

## Core distinctions

### Recommendation != Decision

Recommendations, professional findings, completeness outcomes, decision preparation records, and workflow step completions do not create `GovernmentDecision` records. Only explicit Phase 8 decision execution with authority evaluation, frozen evidence, readiness `READY`, and configured permissible outcomes may record a final decision.

### AI assistance != Decision

`DecisionPreparationRecord.aiAssistanceMetadata` may annotate support provided to a human decision-maker. Service identities and AI actors cannot perform consequential `DECIDE`, `SIGN`, `ISSUE`, `SUSPEND`, `REVOKE`, or `HEAR_REVIEW` actions.

### Access != Authority

Session authentication and case visibility do not substitute for `AuthorityEvaluationService` outcomes on consequential actions.

### Technical readiness != Institutional acceptance != Production active

Issuance readiness evaluates technical catalog activation, authority, signatures, seals, and precedent conditions. A recorded `GovernmentDecision` alone does not constitute issuance. A generated document alone is not an official instrument until a successful issuance event completes.

### Suspension != Revocation

`OfficialInstrumentStatus.SUSPENDED` and `OfficialInstrumentStatus.REVOKED` are distinct lifecycle states. Suspension notice and revocation notice instrument kinds are catalogued separately from license, permit, and certificate kinds.

### Retained national != ABSEZ issuance

Instrument type versions with `retainedNationalBoundary` block ABSEZ-issued instruments unless issuance is explicitly coordinated through retained-national or authenticated external issuer sources.

## Core models

### Phase 7E evidence (referenced by decisions)

- `EvidencePacket` / `EvidencePacketVersion` — frozen evidence snapshots required for decision execution

### Phase 8B decisions

- `DecisionType` / `DecisionTypeVersion` — decision catalog and permissible outcomes
- `DecisionReadinessAssessment` — readiness gate before decision execution
- `DecisionPreparationRecord` — non-final drafting and recommendations
- `GovernmentDecision` — final institutional decision with integrity hash
- `DecisionCondition` — structured conditions including `PRECEDENT_TO_ISSUANCE`

### Phase 8E issuance

- `InstrumentTypeDefinition` / `InstrumentTypeVersion` — issuance catalog
- `InstrumentTemplate` / `InstrumentTemplateVersion` — controlled rendering templates
- `InstrumentNumberingRule` / `InstrumentNumberReservation` — server-assigned instrument numbers
- `OfficialInstrument` / `OfficialInstrumentVersion` — issued instrument and version history
- `IssuanceReadinessAssessment` / `IssuanceEvent` — issuance gates and audit trail

## Phase integrations

### Phase 4 — Authority

All consequential Phase 8 actions evaluate authority through `AuthorityEvaluationService` with explicit `AuthorityActionType` checks.

### Phase 6 — Workflow

`DECISION_GATE` and `ISSUANCE_GATE` integrate with Phase 8 through `WorkflowRuntimeService`:

- `DECISION_GATE` — requires a recorded `GovernmentDecision` (`RECORDED` or `EFFECTIVE`) and transitions the case to `DECIDED`
- `ISSUANCE_GATE` — requires an `OfficialInstrument` with status `ISSUED` and transitions the case to `ISSUED`

### Phase 7 — Evidence and records

Decision execution requires a frozen `EvidencePacketVersion` linked to the case and master administrative file. Issuance readiness may block on unmet precedent conditions, invalid signature/seal document references, or inactive catalog entities.

## API surface

### Decisions (`/api/v1/decisions`)

- `POST /readiness/assess` — assess whether a case is ready for authorized government decision
- `POST /execute` — record an authorized government decision (requires explicit intent confirmation)
- `POST /preparation` — create a non-final decision preparation record

### Issuance (`/api/v1/decisions-issuance`)

- `POST /readiness/assess` — assess whether issuance may proceed
- `POST /issue` — issue official instrument and transition case to `ISSUED`

## Explicit exclusions (Phase 8 boundary)

Phase 8 does NOT:

- treat recommendations or preparation records as final decisions
- allow clients to set decision status, instrument numbers, or authority evaluation identifiers
- issue ABSEZ instruments for retained-national matters without coordinated issuer source
- collapse suspension and revocation into one status
- implement Phase 9 enforcement actions

## Test coverage

- `test/phase-8-decisions-issuance.e2e-spec.ts` — E2E scenarios 1–11
- `test/phase-8-decisions-issuance.must-fail.e2e-spec.ts` — 70 must-fail invariants
- `test/phase-8-decisions-issuance.concurrency.e2e-spec.ts` — duplicate/conflict concurrency cases
- `test/helpers/phase-8-test-fixtures.ts` — NON_PRODUCTION fixture seeding
