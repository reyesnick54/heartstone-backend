# Phase 10 — Complaints, Reconsideration, Appeals and Redress Engine

## Objective

Provide governed pathways for complaints, administrative correction, clarification, reconsideration, internal review, statutory and external appeals, automation challenges, and redress implementation — while preserving strict institutional distinctions between filing, standing, timeliness, review authority, interim relief, disposition, and downstream implementation.

Phase 10 records and coordinates redress proceedings. It does not replace courts, external tribunals, or later-phase national oversight and transparency systems (Phase 11).

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Redress route catalog** | What pathways, grounds, remedies, and deadlines exist? (not a proceeding) |
| **Redress filing** | What was submitted and when? (not standing, timeliness, or disposition) |
| **Standing assessment** | Does the filer have standing to proceed? (not established by filing alone) |
| **Timeliness assessment** | Was the filing timely? (distinct from standing) |
| **Complaint classification / investigation** | What service, conduct, or privacy issue is being addressed? (not an appeal) |
| **Administrative correction** | What nonsubstantive notice error is being fixed? (not reconsideration) |
| **Clarification** | What explanatory response is requested? (not substantive reversal) |
| **Review record snapshot** | What original decision record is pinned for review? (not a new decision) |
| **Review assignment / independence** | Who may review and are they independent? (not review authority alone) |
| **RedressDecision** | What institutional redress disposition was recorded? (not implementation) |
| **Interim relief / stay** | What temporary effect was explicitly authorized? (not reversal) |
| **External review referral** | What package was transmitted externally? (not external determination) |
| **RedressImplementationPlan** | What downstream actions implement the disposition? (not the disposition itself) |
| **GovernmentDecision (Phase 8)** | What original final decision is being challenged? (preserved, not deleted) |
| **OfficialInstrument (Phase 8)** | What issued instrument may be stayed? (lifecycle unchanged unless stay authorized) |

## Canonical module

All Phase 10 logic lives under `src/redress/`.

## Core distinctions

### Complaint != Appeal

Service, conduct, and privacy-security complaint routes investigate service quality and institutional conduct. They do not substitute for reconsideration, internal review, statutory appeal, professional challenge, regulatory review, ombuds oversight, or judicial review coordination. Mislabeled appeals filed as complaints must be rejected or reclassified.

### Clarification != Correction

`ClarificationRequest` records requests for explanatory response without altering substantive decision content. `AdministrativeCorrectionMatter` records nonsubstantive notice fixes. Clarification cannot alter substantive decisions; correction cannot alter substantive outcomes, material reasons, or review rights.

### Correction != Reconsideration

Administrative correction preserves the original decision and fixes notice-level errors only. Reconsideration proceeds under `ReconsiderationProceeding` with pinned review snapshots and preserved original records. A correction route does not reopen substantive review.

### Reconsideration != Statutory Appeal

Reconsideration is an internal reconsideration pathway with original-record preservation and separated later evidence. Statutory appeal follows appeal route catalog rules including deadline extension, external referral, and appeal-specific grounds. The pathways are catalogued separately and must not be collapsed.

### Internal Review != External Appeal

`InternalAdministrativeReview` is a domestic independent review proceeding. Statutory appeal, professional challenge, regulatory review, ombuds oversight, and judicial review coordination are distinct external or externally-coordinated pathways. Internal review assignment and independence rules do not substitute for external referral or authenticated external determination.

### Filing != Standing

`RedressFiling` submission creates intake evidence only. `RedressStandingAssessment` with explicit `AuthorityEvaluationRecord` and `HEAR_REVIEW` evaluation establishes whether the filer may proceed. Filing alone never establishes standing.

### Filing != Timeliness

Timeliness is assessed separately through `RedressTimelinessAssessment` with its own authority evaluation, filing deadline, and actual filing date. A timely filing does not establish standing; standing does not establish timeliness.

### Filing != Stay

Filing submission does not suspend challenged instruments or decisions. `ReviewStayRecord` requires explicit authorized interim relief with `HEAR_REVIEW` authority evaluation. Routes may configure `automaticStayOnFiling`, but stay is never implied from filing alone.

### Stay != Reversal

Interim stay records temporary effect on instrument lifecycle through `InstrumentLifecycleService.authorizeStay`. Stay does not reverse, vary, or delete the original `GovernmentDecision` or `OfficialInstrument`. `ReviewStayRecord.isReversal` remains false for interim stays.

### Recommendation != Review Disposition

`RedressDecisionOutcome.RECOMMENDATION` and `isRecommendation: true` record non-final advice. Final disposition requires explicit `isFinalDisposition: true` with separate authority evaluation. A recommendation cannot be marked as final disposition.

### AI Assistance != Appeal Decision

Automation challenges may receive AI-generated outputs and human-readable explanations, but AI and service identities cannot record redress dispositions or perform `UPHOLD`, `REVERSE`, `DISMISS`, `VARIED`, `ADJUDICATE`, `DECIDE`, or `GRANT_STAY` actions. `AutomationChallengeDisposition` requires human authority evaluation.

### Review Permission != Review Authority

Matter or filing access through session authentication does not confer review authority. `ReviewAuthorityAssessment` evaluates function authority, appointment validity, delegation state, and jurisdiction separately from assignment. Case manager visibility and technical access are not authority sources.

### Reversal != Deletion of Original Decision

Redress outcomes such as `REVERSED` or `VARIED` preserve the original `GovernmentDecision` through `originalDecisionPreserved: true` and pinned `ReviewRecordSnapshot` references. Redress never deletes or overwrites Phase 8 decision records.

### Successful Disposition != Completed Implementation

Recording a final `RedressDecision` transitions the matter toward implementation but does not mark the disposition implemented. `RedressImplementationPlan` actions must complete, the plan must reach `COMPLETED`, and verification must occur before `isImplemented` is set on the decision.

### External Referral != External Determination

`ExternalReviewReferral` and versioned `ExternalReviewPackage` record transmission to an external authority. `ExternalReviewDetermination` records receipt and authenticity of the external response. Referral status alone does not constitute domestic disposition or implementation.

### Judicial Review Information != Court Adjudication

`JUDICIAL_REVIEW_COORDINATION` coordinates information exchange and referral packaging for court proceedings. Phase 10 does not adjudicate judicial review, issue court orders, or substitute for court determination.

## Core models

### Route catalog

- `RedressRouteDefinition` / `RedressRouteVersion` — governed pathway definitions with filing rules, independence requirements, and review function authority bindings
- `RedressRouteEligibleMatter` — eligible underlying matter types per route version
- `RedressRouteGround` — permissible grounds of challenge or complaint
- `RedressRouteRemedyDefinition` — catalogued remedy types including substantive vs nonsubstantive flags

### Matter intake and filing

- `RedressMatter` — redress proceeding linked to case, master file, challenged decision, or instrument
- `RedressFiling` / `RedressFilingVersion` — versioned filing with route classification metadata
- `RedressStandingAssessment` — standing gate with authority evaluation
- `RedressTimelinessAssessment` — timeliness gate with authority evaluation
- `DeadlineExtensionRequest` — deadline extension request and decision
- `RedressAcknowledgment` — filing acknowledgment (does not establish jurisdiction)

### Complaints

- `ComplaintClassification` — service, conduct, privacy-security, or not-a-complaint classification
- `ComplaintInvestigation` — investigation lifecycle
- `ComplaintFinding` / `ComplaintResponse` — investigation outputs (not final disposition)
- `ComplaintCorrectiveAction` — service remedy actions (not substantive reversal)
- `ComplaintClosure` — investigation closure reason

### Correction and clarification

- `AdministrativeCorrectionMatter` — nonsubstantive notice correction with original preservation
- `ClarificationRequest` / `ClarificationResponse` — explanatory clarification without substantive change

### Automation challenge

- `AutomationChallenge` — challenge to AI/automation output
- `AutomationExplanationRecord` — disclosed explanation metadata
- `AutomationChallengeDisposition` — human disposition with authority evaluation

### Review proceedings

- `ReviewAssignment` — reviewer assignment with appointment validation
- `ReviewerIndependenceAssessment` — independence gate separate from assignment
- `ReviewAuthorityAssessment` — review function authority gate separate from access
- `ReviewRecordSnapshot` / `ReviewIssue` / `ReviewSubmission` — pinned original record with separated later evidence
- `ReconsiderationProceeding` — reconsideration-specific proceeding metadata
- `InternalAdministrativeReview` — internal review proceeding metadata

### External review

- `ExternalReviewReferral` — referral lifecycle to external authority
- `ExternalReviewPackage` — versioned transmitted package with integrity hash
- `ExternalReviewDetermination` — received determination with authenticity state

### Disposition, interim relief, and implementation

- `RedressDecision` / `RedressFinding` / `RedressReason` / `RedressRemedy` — institutional redress disposition
- `InterimReliefRequest` — interim relief request (does not auto-grant stay)
- `ReviewStayRecord` — explicit authorized stay record linked to challenged instrument
- `RedressImplementationPlan` / `RedressImplementationAction` / `RedressImplementationVerification` — downstream implementation with Phase 8/9 controlled action flags
- `RedressNotice` — governed notices including privileged investigation notes

## Route catalog and 13 target pathways

Active `RedressRouteVersion` records expose applicable routes via `GET /api/v1/redress/routes`. Each pathway is a distinct `RedressRouteCategory`:

| # | Category | Pathway purpose |
|---|---|---|
| 1 | `ADMINISTRATIVE_CORRECTION` | Nonsubstantive notice correction without altering decision outcome |
| 2 | `CLARIFICATION` | Explanatory response without substantive decision change |
| 3 | `SERVICE_COMPLAINT` | Service quality complaint investigation and service remedy |
| 4 | `CONDUCT_COMPLAINT` | Official conduct complaint investigation |
| 5 | `PRIVACY_SECURITY_COMPLAINT` | Privacy and security complaint investigation |
| 6 | `AI_AUTOMATION_CHALLENGE` | Human review of challenged automation output |
| 7 | `RECONSIDERATION` | Internal reconsideration with original record preservation |
| 8 | `INTERNAL_ADMINISTRATIVE_REVIEW` | Independent internal administrative review |
| 9 | `STATUTORY_APPEAL` | Statutory appeal with timeliness and external referral support |
| 10 | `PROFESSIONAL_CHALLENGE` | Professional qualification or conduct challenge pathway |
| 11 | `REGULATORY_REVIEW` | Regulatory review and coordination pathway |
| 12 | `OMBUDS_OVERSIGHT` | Ombuds oversight referral and coordination pathway |
| 13 | `JUDICIAL_REVIEW_COORDINATION` | Court coordination and information exchange (not adjudication) |

Route versions configure `filingDeadlineDays`, `permitsDeadlineExtension`, `requiresIndependence`, `automaticStayOnFiling`, `permitsSubstantiveChange`, `permitsNonSubstantiveCorrection`, and `reviewFunctionAuthorityRecordId`. Only `ACTIVE` route versions accept new filings.

## Phase integrations

### Phase 3 — Identity & Access

- All applicant-facing endpoints use `SessionAuthGuard` and `@CurrentSession()`
- `RedressMatter.filerIdentityId` is bound from authenticated session on matter and filing creation
- `RedressAccessService` enforces filer, representative, and staff access scopes
- `RepresentativeAuthority` is validated for representative filing scope and expiry
- IDOR protection prevents cross-identity matter and notice access

### Phase 4 — Authority

All consequential Phase 10 actions evaluate authority through `AuthorityEvaluationService` with explicit `AuthorityActionType.HEAR_REVIEW` checks:

- standing assessment
- timeliness assessment
- deadline extension decision
- automation challenge disposition
- redress disposition recording
- interim stay authorization
- external determination implementation

Fresh authority evaluation is required for each consequential action. Stale evaluations cannot support new dispositions. Unresolved authority triggers safe halt.

### Phase 6 — Workflow & Case Management

- `RedressMatter` optionally links to Phase 6 `Case` and must align `challengedDecisionId` with the specified case
- Multiple redress matters (complaint and appeal) may remain open on the same case simultaneously
- Redress proceedings are separate administrative matters; case assignment and workflow step completion do not confer review disposition authority

### Phase 7 — Evidence & Records

- `RedressMatter.masterAdministrativeFileId` links proceedings to the authoritative administrative record
- `ReviewRecordSnapshot` pins original decision references with integrity hash for reconstructable review
- Later evidence is recorded as `ReviewSubmission.isLaterEvidence` separately from the pinned snapshot
- Evidence integrity compromise and non-reconstructable snapshots trigger safe halt
- Phase 7 `LegalHold` may prevent redress handling (`LEGAL_HOLD_PREVENTS_HANDLING` safe halt reason)

### Phase 8 — Decisions & Issuance

- `RedressMatter.challengedDecisionId` references preserved `GovernmentDecision` records
- `RedressMatter.challengedInstrumentId` references `OfficialInstrument` subject to stay
- Interim stays integrate with `InstrumentLifecycleService.authorizeStay` without reversing instrument status
- Implementation actions may be flagged `phase8Controlled` for controlled instrument or decision lifecycle updates
- Redress reversal or variation preserves original Phase 8 records; it does not delete them

### Phase 9 — Compliance

- Implementation actions may be flagged `phase9Controlled` for compliance-status updates driven by redress outcomes
- Phase 10 records redress implementation plans and failures; Phase 9 compliance enforcement modules consume explicit controlled actions rather than inferring compliance state from filing or disposition alone

## Safe halt conditions

When critical preconditions cannot be satisfied, `RedressSafeHaltService` transitions the matter to `RedressMatterStatus.SAFE_HALTED` with an explicit `RedressSafeHaltReason`:

| Reason | Trigger |
|---|---|
| `AUTHORITY_UNRESOLVED` | Required `HEAR_REVIEW` authority evaluation does not return `ALLOW` |
| `REVIEWER_APPOINTMENT_INVALID` | Review assignment references invalid or expired appointment |
| `INDEPENDENCE_NOT_ESTABLISHED` | Reviewer independence assessment blocked |
| `SNAPSHOT_NOT_RECONSTRUCTABLE` | Review record snapshot cannot be validated or reconstructed |
| `EVIDENCE_INTEGRITY_COMPROMISED` | Pinned or referenced evidence integrity failure |
| `ROUTE_SUPERSEDED` | Active matter bound to superseded route version |
| `EXTERNAL_AUTHENTICITY_UNRESOLVED` | External determination received as `UNVERIFIED` |
| `NOTICE_CANNOT_BE_PROVIDED` | Required notice cannot be issued to affected parties |
| `IMPLEMENTATION_AUTHORITY_BYPASS` | Implementation attempted without required authority path |
| `LEGAL_HOLD_PREVENTS_HANDLING` | Phase 7 legal hold blocks proceeding |

Safe-halted matters reject consequential redress actions until the halt condition is resolved.

## Security controls

- **Session authentication** — all `/api/v1/redress` endpoints require authenticated sessions
- **Client field protection** — `RedressBoundaryService.rejectClientProtectedFields` blocks client writes to status, halt state, disposition flags, authority evaluation identifiers, stay flags, and substantive mutation flags
- **Human-actor requirement** — standing, timeliness, disposition, interim relief, automation disposition, and external implementation require human institutional actors via `InstitutionalActorResolver`
- **AI adjudication prohibition** — AI actors cannot perform forbidden redress adjudication actions
- **Access vs authority separation** — matter access checks do not substitute for `HEAR_REVIEW` authority evaluation
- **Representative scope validation** — representative access requires active, scoped `RepresentativeAuthority`
- **Privileged notice protection** — `RedressNotice.isPrivileged` investigation notes are withheld from non-staff disclosure
- **Route integrity** — inactive or superseded route versions cannot accept filings; requested route category must match route definition category
- **Original record preservation** — challenged decisions and pinned snapshots remain immutable references during redress

## API surface

All routes are under `/api/v1/redress`.

### Route catalog

- `GET /routes` — list applicable active redress routes

### Matters and filings

- `POST /matters` — open a redress matter linked to case, master file, decision, or instrument
- `GET /matters/:id` — fetch redress matter (access-controlled)
- `POST /filings` — create draft redress filing
- `POST /filings/:id/submit` — submit filing for intake
- `POST /filings/:id/classify` — classify filing route category

### Standing and timeliness

- `POST /standing/assess` — assess standing with authority evaluation
- `POST /timeliness/assess` — assess filing timeliness with authority evaluation
- `POST /deadline-extensions` — request filing deadline extension
- `POST /deadline-extensions/:id/decide` — decide deadline extension request

### Complaints, correction, and clarification

- `POST /complaints/classify` — classify complaint matter
- `POST /complaints/investigations` — start complaint investigation
- `POST /complaints/investigations/:id/close` — close complaint investigation
- `POST /corrections` — create nonsubstantive administrative correction
- `POST /clarifications` — request clarification without substantive change

### Automation and review

- `POST /automation/challenges` — file AI/automation challenge
- `POST /automation/challenges/:id/disposition` — record human disposition
- `POST /review/assignments` — assign independent reviewer
- `POST /review/assignments/:id/independence` — assess reviewer independence
- `POST /review/snapshots` — pin original review record snapshot
- `POST /reconsideration` — open reconsideration proceeding
- `POST /internal-review` — open internal administrative review

### External review, disposition, and implementation

- `POST /external/referrals` — create external review referral
- `POST /decisions` — record redress disposition with `HEAR_REVIEW` authority
- `POST /interim-relief` — request interim relief / stay
- `POST /interim-relief/:id/decide` — decide interim relief request
- `POST /implementation/plans` — create redress implementation plan
- `POST /notices` — issue redress notice
- `GET /matters/:id/notices` — list notices for matter (privileged notices filtered for non-staff)

## Explicit exclusions (Phase 10 boundary)

Phase 10 does NOT:

- treat complaints as appeals or appeals as service complaints without reclassification
- establish standing, timeliness, or stay from filing submission alone
- allow AI or service identities to record final redress dispositions
- delete or overwrite original Phase 8 `GovernmentDecision` records on reversal
- treat external referral, acknowledgment, or investigation findings as final disposition
- adjudicate judicial review or substitute for court determination
- auto-implement dispositions without explicit implementation plan completion and verification
- implement Phase 11 national oversight, transparency reporting, or cross-jurisdiction ombuds operating systems

## Test coverage

Phase 10H enforces 75 architectural invariants through a layered test pyramid:

### Unit

- `src/redress/redress.must-fail.spec.ts` — forbidden client fields, AI adjudication, route/category boundaries, substantive correction guards
- `src/redress/redress-phase-10h.spec.ts` — boundary service invariant catalogue
- `src/redress/redress-schema.spec.ts` — canonical model/enum coherence and relationship separation

### Integration

- `test/phase-10-redress.integration-spec.ts` — filing vs standing/disposition separation, route listing, protected field rejection

### E2E

- `test/phase-10-redress.e2e-spec.ts` — scenarios E2E 1–12 covering correction, complaint, reconsideration, internal review, timeliness extension, stay, external referral, AI challenge, and implementation
- `test/phase-10-redress.must-fail.e2e-spec.ts` — 75 must-fail invariants (boundary, client, authority, route, review, AI, implementation, safe-halt, external, notice)
- `test/phase-10-redress.concurrency.e2e-spec.ts` — duplicate disposition, stay vs instrument lifecycle, external determination race, correction vs reconsideration coexistence, withdrawal race, implementation retry visibility

### Fixtures

- `test/helpers/phase-10-test-fixtures.ts` — NON_PRODUCTION fixture seeding for routes, authority, and review actors
