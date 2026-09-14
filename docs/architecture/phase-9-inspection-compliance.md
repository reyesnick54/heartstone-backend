# Phase 9: Inspection, Compliance and Corrective Action

Phase 9 extends HeartStone with post-issuance compliance monitoring, institutional inspection execution, findings management, corrective action tracking, escalation, and enforcement referral preparation.

## Scope

Phase 9 lives under `src/compliance/` and adds Prisma models appended in migration `20260913220000_phase_9_inspection_compliance`.

### Canonical entities

| Entity | Purpose |
| --- | --- |
| `ComplianceMatter` | Root compliance case linked to instrument, master file, and/or case |
| `ContinuingObligation` | Institutional obligation distinct from holder submissions |
| `ObligationSchedule` | Due-date schedule for recurring obligations |
| `ComplianceSubmission` | Holder submission (receipt ≠ satisfaction) |
| `ComplianceReview` | Institutional verification of submission |
| `InspectionTypeDefinition` | Catalog of inspection types requiring `INSPECT` authority |
| `InspectionPlan` | Scheduled inspection plan |
| `InspectionAssignment` | Inspector assignment with authority evaluation |
| `InspectionSession` | Phase 9 session; optional `inspectionRecordId` links Phase 7 stack |
| `InspectionObservation` | Field observation (not a finding) |
| `InspectionFinding` | Institutional finding (not automatically a violation) |
| `CorrectiveActionPlan` / `CorrectiveActionItem` / `CorrectiveActionVerification` | Corrective workflow with independent verification |
| `ComplianceFindingClosure` / `ComplianceFindingReopening` | Authorized closure and reopen audit trail |
| `ComplianceAssessment` | Matter-level compliance assessment |
| `NoncomplianceFinding` | Explicit violation record when `isViolation=true` |
| `ComplianceEscalation` / `EnforcementReferral` | Escalation and referral (not suspension) |
| `EmergencyInterimActionRecord` | Interim safety action without instrument suspension |
| `ComplianceStatusProjection` | Informational projection (not legal status) |
| `ComplianceMonitoringEvent` / `ComplianceAlert` | Append-only monitoring signals |
| `ComplianceRevalidationRecord` | Revalidation after corrective action |

## Architectural boundaries

Phase 9 enforces 50 invariants (`PHASE_9H_INVARIANTS` in `compliance.constants.ts`):

- **Obligation ≠ Submission ≠ Verification** — receipt acknowledgment alone never satisfies an obligation.
- **Observation ≠ Finding ≠ Violation** — Phase 7 `InspectionService` is reused via optional `InspectionSession.inspectionRecordId`; Phase 9 observations and findings are separate records.
- **No suspension decisions** — Phase 9 cannot create Phase 8 suspension decisions or PATCH `OfficialInstrument.status`.
- **Holder restrictions** — instrument holder cannot self-close findings or verify corrective actions.
- **INSPECT authority** — inspector assignment requires permitted `AuthorityActionType.INSPECT` evaluation.

## Module structure

```
src/compliance/
  compliance.module.ts
  compliance.controller.ts
  compliance.constants.ts
  compliance-boundary.service.ts
  compliance-matter.service.ts
  continuing-obligation.service.ts
  compliance-submission.service.ts
  compliance-review.service.ts
  inspection-planning.service.ts
  inspection-execution.service.ts   # wraps Phase 7 InspectionService
  inspection-finding.service.ts
  corrective-action.service.ts
  compliance-escalation.service.ts
  enforcement-referral.service.ts
  emergency-interim-action.service.ts
  compliance-projection.service.ts
```

## API surface

All routes are under `/api/v1/compliance/*`, guarded by `SessionAuthGuard`. Protected client fields are rejected at the controller via `ComplianceBoundaryService`.

Key endpoints:

- `POST /compliance/matters/open`
- `POST /compliance/obligations`
- `POST /compliance/submissions`
- `POST /compliance/reviews`
- `POST /compliance/inspection/plans`
- `POST /compliance/inspection/assignments`
- `POST /compliance/inspection/sessions/start`
- `POST /compliance/inspection/observations`
- `POST /compliance/inspection/findings`
- `POST /compliance/inspection/findings/close`
- `POST /compliance/corrective-action/plans`
- `POST /compliance/corrective-action/verify`
- `POST /compliance/escalations`
- `POST /compliance/enforcement/referrals`
- `POST /compliance/emergency/interim-actions`
- `POST /compliance/projections`

## Phase dependencies

| Phase | Relationship |
| --- | --- |
| Phase 7 | Reuses `InspectionRecord` / `InspectionService`; does not duplicate inspection stack |
| Phase 4 | `AuthorityEvaluationService` with `INSPECT` for assignments |
| Phase 8 | Links to `OfficialInstrument`, `Case`, `MasterAdministrativeFile`; cannot mutate instrument lifecycle status |

## Tests

- Unit: `src/compliance/compliance-phase-9.must-fail.spec.ts`, `compliance-boundary.service.spec.ts`
- Integration: `test/phase-9-compliance.integration-spec.ts`
- E2E: `test/phase-9-inspection-compliance.e2e-spec.ts` (6 flows)
- Must-fail E2E: `test/phase-9-inspection-compliance.must-fail.e2e-spec.ts` (50 invariants)
- Concurrency E2E: `test/phase-9-inspection-compliance.concurrency.e2e-spec.ts`
- Fixtures: `test/helpers/phase-9-test-fixtures.ts`
