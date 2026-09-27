# Authority evaluation trust boundary (S1)

HeartStone authority evaluation separates **what the caller may identify** from **what the server must prove** before a consequential action is allowed.

## Invariant

`User != Identity != Officeholder != Appointment != Role != Permission != Authority`

Authentication and API access never substitute for institutional authority. Client payloads must not assert authority facts.

## Input classification

| Class | Description | Examples |
| ----- | ----------- | -------- |
| **A — Caller resource / action identifiers** | Which function, action, and institutional scope the caller intends to evaluate | `functionAuthorityRecordId`, `action`, `officeholderId`, `officeId`, `appointmentId`, `delegationId`, `caseId`, `evidencePacketVersionId`, `decisionReadinessAssessmentId`, `transactionAmount`, `scopeValue` |
| **B — Server-derived institutional facts** | Appointment/delegation validity, assignments, governing sources, institutional acts, prior consequential actions, conflict/recusal, second approval | Resolved by `AuthorityFactsResolver` from PostgreSQL |
| **C — Server-derived security facts** | Session identity, identity type, officeholder link | `SessionAuthGuard`, `InstitutionalActorResolver` |
| **D — Server-derived evidence / state facts** | Evidence packet contents, MAF completeness signals, decision participants | Resolved from case / packet / readiness records |

## Never trusted from HTTP for authorization outcome

The public `POST /authority/evaluate` route accepts deprecated optional fields for backward compatibility, but **`AuthorityEvaluationService` ignores caller values** for:

- evaluation timestamp (`at`)
- `hasSecondApproval`, `hasConsultation`, `hasSupervision`, `hasLiaison`
- `isSelfApproval`, `isConflicted`, `isRecused`
- `priorActions`, `evidenceProvided`, `qualificationCodes`

Live authorization always uses **trusted server time** (`new Date()` at evaluation).

## Historical / replay evaluation

Point-in-time replay is **not** available on the public evaluate route. Internal callers may use `privilegedHistoricalAt` on the internal request type for audited analysis; that pathway must never gate a present consequential action.

## Audit snapshot

Each `AuthorityEvaluationRecord.contextSnapshot` stores:

- caller identifiers (category A)
- `derivedFacts` (category B/D summary)
- `authoritativeSourceRefs` (record IDs used to derive facts)

Caller assertions are not stored as authoritative inputs.
