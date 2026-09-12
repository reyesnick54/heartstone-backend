# Phase 6 — Applications, Workflow Orchestration & Case Management

## Objective

Process citizen applications through immutable submission, case creation, workflow orchestration, completeness review, referrals, SLA tracking, and escalation — stopping at `DECISION_PENDING` without making final government decisions or issuing instruments.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Application** | What is the ongoing request? |
| **ApplicationSubmission** | What is the immutable versioned submission snapshot? |
| **Case** | What is the persistent administrative matter? |
| **WorkflowDefinition/Version** | What is the approved processing procedure? |
| **CaseWorkflowInstance** | What is the runtime workflow execution? |
| **CompletenessReview** | Is the submission administratively complete? (not eligibility/approval) |
| **CaseAssignment** | Who is assigned to work the case? (not institutional authority) |
| **CaseReferral** | What controlled coordination is required? (not authority transfer) |
| **CaseEvent** | What operational history occurred? |
| **AuthorityEvaluationService** | Does the actor have institutional authority for consequential actions? |
| **GovernmentDecision** | Phase 8/later |
| **Issuance** | Later phases |
| **Master Administrative File / Evidence Engine** | Phase 7 |

## Canonical module

All Phase 6 logic lives under `src/application-processing/`.

## Core models

- `Application` — applicant request with pinned service/form configuration
- `ApplicationSubmission` — immutable submission with content hash and acknowledgment
- `Case` — administrative matter linked to application with pinned workflow version
- `CaseStatusHistory` — auditable status transitions
- `WorkflowDefinition` / `WorkflowVersion` — approved procedure definitions
- `WorkflowStageDefinition` / `WorkflowStepDefinition` / `WorkflowTransitionDefinition` — workflow graph
- `CaseWorkflowInstance` / `CaseWorkflowStepInstance` — runtime execution
- `CompletenessReview` / `DeficiencyNotice` / `ApplicantInformationRequest` — completeness/RFI loop
- `CaseAssignment` — work assignment (not authority)
- `CaseReferral` / `CaseReferralResponse` — external/internal coordination
- `CaseSlaClock` — time accounting with pause support
- `CaseEscalation` / `CaseIssue` — operational escalation and issues
- `CaseEvent` / `CaseCommunication` / `CaseMilestone` — timeline
- `CasePublicStatusProjection` — applicant-facing read model

## Immutable submission & version pinning

On application creation, the system pins:

- `GovernmentServiceVersion`
- `FormDefinition` / `FormVersion`
- `configurationFingerprint` (Phase 5 hash)
- Checklist and fee configuration references

Submissions store immutable `answersSnapshot` and `contentHash`. Corrections create new `ApplicationSubmission` records; prior submissions are marked `SUPERSEDED` but never modified.

## Phase integrations

### Phase 3 — Identity

- Applicant endpoints use `SessionAuthGuard` + `@CurrentSession()`
- `RepresentativeAuthority` validated for `AUTHORIZED_REPRESENTATIVE` category
- Organization membership enforced; arbitrary org submission blocked

### Phase 4 — Authority

- Consequential workflow steps call `AuthorityEvaluationService`
- `CaseAssignment` does not grant authority
- OIDC groups, case manager roles, and technical admin roles are not authority sources
- Expired appointments and revoked delegations block consequential steps

### Phase 5 — Service catalog

- Applications require active, non-superseded `GovernmentServiceVersion`
- `configurationFingerprint` must match pinned start package
- Published `FormVersion` required for submission
- Suspended services block new applications

## Workflow runtime

- Workflow version pinned at case creation
- Step completion validates current step is active
- Parallel branches use `ALL_REQUIRED` join semantics
- `DECISION_GATE` and `ISSUANCE_GATE` fail closed in Phase 6
- Safe-halted workflows cannot continue normal processing
- Suspended workflow versions cannot start new instances

## API surface

### Applicant (`/api/v1/applications`)

- `POST /applications` — create draft
- `PATCH /applications/:id/draft` — update draft
- `POST /applications/:id/submit` — immutable submission + case creation
- `POST /applications/:id/corrections` — applicant correction when `WAITING_APPLICANT`

### Case processing (`/api/v1/cases`)

- `GET /cases/:id` — case detail (owner or official)
- `GET /cases/:id/applicant-status` — applicant public status projection
- `POST /cases/:id/workflow/steps/:stepKey/complete` — complete workflow step
- `POST /cases/:id/completeness-reviews` — run completeness review
- `POST /cases/:id/referrals` — create referral
- `POST /cases/referrals/:referralId/responses` — record referral response

### Workflow administration (`/api/v1/workflow-definitions`)

- `POST /workflow-definitions` — create definition
- `POST /workflow-definitions/:id/versions` — create version with graph
- `POST /workflow-definitions/versions/:versionId/approve` — approve version

## Explicit exclusions (Phase 6 boundary)

Phase 6 does NOT create:

- `GovernmentDecision`
- `IssuedLicense` / `IssuedPermit` / `IssuedCertificate`
- Evidence Vault / Master Administrative File (Phase 7)
- Final approval or refusal outcomes

## Acceptance tests

| Suite | Path | Coverage |
|---|---|---|
| Schema coherence | `src/application-processing/application-processing-schema.spec.ts` | Model boundary |
| E2E happy/incomplete/authority | `test/phase-6-applications-workflow.e2e-spec.ts` | End-to-end flows |
| Must-fail invariants | `test/phase-6-applications-workflow.must-fail.e2e-spec.ts` | 50+ architectural gates |
