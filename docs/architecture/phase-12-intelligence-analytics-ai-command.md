# Phase 12 — Government Intelligence, Analytics, Reporting & Controlled AI Command Layer

## Objective

Provide institutional analytics, performance measurement, dashboards, strategic project visibility, controlled AI assistance, monitoring, risk assessment, digital twin simulation, and decision traceability — without conflating data, projections, recommendations, or alerts with legal authority, verified evidence, government decisions, or operational activation.

Phase 12 lives under `src/intelligence/` and adds 60 Prisma models in migration `20260915180000_phase_12_intelligence_analytics_ai_command`.

## Critical rule

HeartStone may:

- define performance frameworks, metrics, baselines, and calculation runs
- project dashboard indicators and publish informational executive/departmental views
- record sponsor-reported strategic project milestones and delivery evidence
- register AI models, use cases, and agents; execute recommendatory AI assistance
- run analysis, monitoring observations, alert verification, and risk assessments
- maintain digital twins, run simulations, and record consequential-use reviews
- generate reports, claims, and evidence-dashboard decision traces with historical replay

It must not pretend that:

- raw data or metric observations constitute verified evidence or performance verdicts
- dashboard views, indicators, or projections create authority, delegation, or case disposition
- AI recommendations, risk scores, or alerts are government decisions, sanctions, or violations
- simulation outputs or twin states are live case records or real-world objects
- report publication or approval substitutes for decision notices or authority acts
- technical readiness, model approval, or analytics access equals institutional acceptance or operational activation

## Conceptual separation

| Boundary pair | Layer A (what it is) | Layer B (what it is NOT) |
|---|---|---|
| **Data != Evidence** | `MetricObservation`, `MonitoringObservation`, source data refs | Accepted `EvidencePacket` / attributable evidence record |
| **Evidence != Authority** | `PerformanceClaim.evidencePacketId`, `ReportClaim.evidencePacketVersionId` | Legal authority to decide, waive, or enforce |
| **Analysis != Decision** | `AnalysisRequest`, `AnalysisRun`, `AnalysisFinding`, `AnalysisOption` | `GovernmentDecision` or final administrative order |
| **Recommendation != Approval** | `AIExecutionRecord` (`isRecommendatoryOnly: true`), `SimulationOutput` (`RECOMMENDATION`) | Approval, waiver, or institutional sign-off |
| **Dashboard != Authority** | `DashboardDefinition`, `ExecutiveDashboardService`, `DepartmentalConsoleService` | Delegation grant, command authority, or disposition power |
| **Indicator != Fact without Evidence** | `DashboardIndicatorProjection` with `sourceDataRefs` and disclaimers | Verified institutional fact without evidence linkage |
| **Alert != Verified Event** | `MonitoringAlert` (`OPEN`, `isViolation: false` at raise) | Confirmed breach or enforcement event |
| **Risk Score != Decision** | `RiskAssessment.riskLevel`, `SimulationOutput` (`RISK_INDICATOR`) | Sanction, penalty, or case outcome |
| **Correlation != Causation** | `AnalysisFinding` with correlation methodology | Causal determination or policy mandate |
| **Output != Outcome** | `SimulationOutput`, `AIExecutionRecord.outputsSnapshot` | Achieved government or service outcome |
| **Forecast != Achievement** | Projections, trends, scenario outputs with staleness disclaimers | Completed target or verified achievement |
| **Reported != Verified** | `StrategicProjectMilestone` (`REPORTED`) | `VERIFIED` or `COMPLETED` milestone |
| **Scenario != Prediction** | `SimulationScenario`, `SimulationOutput` (`SCENARIO_COMPARISON`) | Guaranteed future state or mandate |
| **Digital Twin != Real Object** | `DigitalTwinDefinition`, `DigitalTwinVersion`, `DigitalTwinSnapshot` | Physical asset, live case, or real-world entity |
| **Simulation != Live Operation** | `SimulationRun`, `SimulationOutput` | Live workflow, case mutation, or production state |
| **AI Model != Officeholder** | `AIModelDefinition`, `AIAgentDefinition` | Identified institutional actor with legal authority |
| **Agent Permission != Institutional Authority** | `AIToolEntitlement`, `AIDataEntitlement` | `AuthorityEvaluationService` grant or delegation |
| **High Confidence != Legal Sufficiency** | `AIEvaluation.score`, adapter `confidence` field | Legally sufficient determination |
| **Technical Readiness != Institutional Acceptance** | `AIModelStatus.APPROVED`, `AIUseCaseStatus.APPROVED` | Institutional acceptance of operational use |
| **Institutional Acceptance != Operational Activation** | `ReportApproval`, consequential-use review records | Automatic activation of live government operations |

---

## Canonical module

All Phase 12 logic lives under `src/intelligence/`:

```
src/intelligence/
  intelligence.module.ts
  intelligence.controller.ts
  intelligence.constants.ts
  intelligence-schema.constants.ts
  common/
    intelligence-boundary.service.ts
    intelligence-safe-halt.service.ts
  metrics/
    performance-framework.service.ts
    metric-definition.service.ts
    metric-calculation.service.ts
    performance-claim.service.ts
  dashboards/
    dashboard-definition.service.ts
    dashboard-indicator.service.ts
    executive-dashboard.service.ts
    departmental-console.service.ts
  strategic-projects/
    strategic-project.service.ts
  ai/
    ai-model-registry.service.ts
    ai-use-case.service.ts
    ai-agent.service.ts
    ai-execution.service.ts
    ai-prompt-governance.service.ts
    deterministic-ai.adapter.ts
  analysis/
    analysis-engine.service.ts
  monitoring/
    intelligence-monitoring.service.ts
  risk/
    risk-assessment.service.ts
  twins/
    digital-twin.service.ts
    simulation.service.ts
  reports/
    report.service.ts
    historical-replay.service.ts
```

`IntelligenceModule` imports `DatabaseModule`, `SessionsModule`, `AuthorityModule`, `RecordsModule`, and `EvidenceModule`. Boundary enforcement is centralized in `IntelligenceBoundaryService`; safe-halt evaluation in `IntelligenceSafeHaltService`.

---

## Domain 1 — Performance Framework & Metrics (Phase 12A)

Phase 12A covers performance frameworks, metric definitions, baselines, calculation runs, observations, data quality, and performance claims.

### Sub-phases

| Slice | Scope |
|---|---|
| **12A** | Frameworks, metric definitions/versions, baselines, calculation runs, observations, data quality |
| **12A claims** | Performance claims, reviews, revalidations |

### Metrics models

| Model | Purpose |
|---|---|
| `PerformanceFramework` | Institution performance measurement catalog identity |
| `MetricDefinition` | Metric identity within a framework |
| `MetricDefinitionVersion` | Versioned definition config, methodology, limitations |
| `MetricBaseline` | Historical baseline value for a metric version |
| `MetricCalculationRun` | Server-executed calculation attempt with inputs snapshot |
| `MetricObservation` | Recorded observed value for a period |
| `MetricDataQualityAssessment` | Data quality status for observation or run |
| `PerformanceClaim` | Institutional performance assertion linked to metric/evidence |
| `PerformanceClaimReview` | Reviewer outcome on a claim |
| `PerformanceClaimRevalidation` | Revalidation audit when claim status changes |

### Metrics enums

| Enum | Values |
|---|---|
| `MetricDefinitionStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `SUPERSEDED`, `RETIRED` |
| `MetricCalculationRunStatus` | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `SAFE_HALTED`, `CANCELLED` |
| `MetricDataQualityStatus` | `NOT_ASSESSED`, `ACCEPTABLE`, `DEGRADED`, `UNRELIABLE`, `REJECTED` |
| `PerformanceClaimStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `SUPERSEDED`, `WITHDRAWN` |
| `PerformanceClaimReviewOutcome` | `CONFIRMED`, `PARTIALLY_CONFIRMED`, `REJECTED`, `REQUIRES_REVALIDATION` |

### Metrics lifecycles

**Definition**

`DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `ACTIVE`

**Calculation run**

`PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `SAFE_HALTED`

Failed or safe-halted runs block consequential downstream use via `assertCalculationRunFailureSafeHalt()`.

**Performance claim**

`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `VERIFIED` / `REJECTED`

Clients cannot set `status`, `verifiedAt`, or `claimedAt`. Unverified claims cannot be treated as published facts.

---

## Domain 2 — Dashboards & Indicator Projections (Phase 12B)

Phase 12B covers dashboard definitions, versions, widgets, indicators, projections, snapshots, and status dictionary.

### Dashboard models

| Model | Purpose |
|---|---|
| `DashboardDefinition` | Institution dashboard identity |
| `DashboardVersion` | Versioned layout and indicator set |
| `DashboardWidgetDefinition` | Widget placement and config |
| `DashboardIndicatorDefinition` | Indicator bound to optional `MetricDefinition` |
| `DashboardIndicatorProjection` | Computed/displayed indicator value with staleness |
| `DashboardSnapshot` | Point-in-time dashboard capture for traceability |
| `DashboardStatusDictionaryEntry` | Controlled status vocabulary |

### Dashboard enums

| Enum | Values |
|---|---|
| `DashboardDefinitionStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `SUPERSEDED`, `RETIRED` |
| `DashboardIndicatorStatus` | `CURRENT`, `STALE`, `UNAVAILABLE`, `SAFE_HALTED` |

### Dashboard lifecycles

**Projection**

1. Server computes or receives `computedValue` / `displayValue`
2. Staleness flagged via `isStale` and `DashboardIndicatorStatus`
3. Consequential use blocked when stale (`assertStaleIndicatorBlocksConsequentialUse`)
4. Executive and departmental views return informational disclaimers only

**Executive vs departmental**

- `ExecutiveDashboardService.getExecutiveView()` — strategic indicators; not command authority
- `DepartmentalConsoleService.getDepartmentalView()` — operational awareness; not case disposition

Clients cannot set `authorityGranted`, `delegationId`, `governmentDecisionId`, `approved`, `refused`, or `issued` on dashboard payloads.

---

## Domain 3 — Strategic Projects & Delivery Evidence (Phase 12C)

Phase 12C covers strategic project profiles, sponsor-reported milestones, capital/employment/infrastructure evidence, and status projections.

### Strategic project models

| Model | Purpose |
|---|---|
| `StrategicProjectProfile` | Institution strategic project identity |
| `StrategicProjectMilestone` | Sponsor-reported or verified milestone |
| `CapitalEvidenceRecord` | Capital spend evidence (optional `evidencePacketVersionId`) |
| `EmploymentEvidenceRecord` | Jobs created/retained evidence |
| `InfrastructureDeliveryRecord` | Infrastructure delivery reporting |
| `ProjectStatusProjection` | Projected status with disclaimer |

### Strategic project enums

| Enum | Values |
|---|---|
| `StrategicProjectMilestoneStatus` | `REPORTED`, `VERIFIED`, `COMPLETED` |

### Strategic project lifecycles

**Milestone reporting**

Sponsor reports create `REPORTED` milestones. `treatReportedAsVerified()` rejects treating `REPORTED` as verified (`SPONSOR_REPORT_NOT_VERIFIED_MILESTONE`).

**Verification path**

`REPORTED` → `VERIFIED` → `COMPLETED` (via `verifyMilestone()`)

Capital, employment, and infrastructure records are supporting evidence — not audited facts or delivery certificates without separate verification.

---

## Domain 4 — Controlled AI Command Layer (Phase 12D)

Phase 12D covers AI model registry, use cases, agents, entitlements, execution, evaluation, incidents, suspension, and human disposition.

### AI models

| Model | Purpose |
|---|---|
| `AIModelDefinition` / `AIModelVersion` | Registered model identity and version |
| `AIUseCase` / `AIUseCaseVersion` | Scoped purpose with `humanOversightRequired` default `true` |
| `AIAgentDefinition` / `AIAgentVersion` | Agent config and `toolsAllowed` |
| `AIDataEntitlement` | Data-domain access scope for model/use-case version |
| `AIToolEntitlement` | Tool access scope for agent version |
| `AIEvaluation` | Evaluation score and findings (not approval) |
| `AIIncident` | Safety/operational incident record |
| `AISuspensionRecord` | Suspension with `AISuspensionReason` |
| `AIExecutionRecord` | Execution audit with `isRecommendatoryOnly: true` |
| `AIHumanDisposition` | Human disposition on consequential AI output |

### AI enums

| Enum | Values |
|---|---|
| `AIModelStatus` | `DRAFT`, `EVALUATION`, `APPROVED`, `ACTIVE`, `SUSPENDED`, `RETIRED` |
| `AIUseCaseStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `SUSPENDED`, `RETIRED` |
| `AIAgentStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `SUSPENDED`, `RETIRED` |
| `AIExecutionStatus` | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `SAFE_HALTED`, `CANCELLED` |
| `AISuspensionReason` | `SAFETY_INCIDENT`, `EVALUATION_FAILURE`, `DATA_ENTITLEMENT_VIOLATION`, `POLICY_CHANGE`, `HUMAN_OVERSIGHT_REQUIRED`, `OPERATIONAL_RISK`, `OTHER` |
| `AIHumanDispositionType` | `ACCEPTED`, `ACCEPTED_WITH_MODIFICATION`, `REJECTED`, `ESCALATED`, `DEFERRED`, `NO_ACTION_REQUIRED` |

### Forbidden AI actions

`FORBIDDEN_AI_ACTIONS` blocks: `APPROVE`, `REFUSE`, `WAIVE`, `SIGN`, `ISSUE`, `DECIDE`, `FINALIZE_DECISION`, `EXECUTE_ENFORCEMENT`, `APPOINT_OFFICEHOLDER`, `SUSPEND_AUTHORITY`, `REVOKE_INSTRUMENT`, `GRANT_DELEGATION`, `DECLARE_VIOLATION`, `DECLARE_COMPLIANCE`.

### AI execution lifecycle

1. Reject client decision fields (`approved`, `refused`, `decided`, `issued`, `signed`, `status`)
2. Assert model/use-case/agent not `SUSPENDED` and no active suspension records
3. Create `AIExecutionRecord` with `isRecommendatoryOnly: true`
4. Execute via `DeterministicAiAdapter` (returns `REVIEW_REQUIRED`, `confidence: 0`, `isBinding: false`)
5. Block consequential completion without `AIHumanDisposition`

`DeterministicAiAdapter` is the current production adapter; it is explicitly not a decision engine.

---

## Domain 5 — Analysis, Monitoring & Risk (Phase 12E)

Phase 12E covers analysis requests/runs, findings, options, monitoring observations/alerts, alert verification, and risk assessments.

### Analysis & monitoring models

| Model | Purpose |
|---|---|
| `AnalysisRequest` | Scoped analysis request (not a decision request) |
| `AnalysisRun` | Methodology execution with inputs snapshot |
| `AnalysisFinding` | Finding record (not final determination) |
| `AnalysisOption` | Option/tradeoff record (not selected decision) |
| `MonitoringObservation` | Rule-triggered or manual observation |
| `MonitoringAlert` | Raised alert (`isViolation: false` at creation) |
| `AlertVerification` | Human verifier outcome |
| `RiskAssessment` | Risk level assessment (not sanction) |

### Analysis & monitoring enums

| Enum | Values |
|---|---|
| `AnalysisRequestStatus` | `DRAFT`, `SUBMITTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `SAFE_HALTED` |
| `AnalysisRunStatus` | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `SAFE_HALTED`, `CANCELLED` |
| `MonitoringAlertStatus` | `OPEN`, `VERIFIED`, `CLOSED` |
| `AlertVerificationOutcome` | `CONFIRMED`, `PARTIALLY_CONFIRMED`, `NOT_CONFIRMED`, `INCONCLUSIVE`, `REQUIRES_FURTHER_MONITORING` |
| `RiskAssessmentStatus` | `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `SUPERSEDED`, `SAFE_HALTED` |

### Alert lifecycle

**Raise**

`MonitoringAlert` created with `status: OPEN`, `isViolation: false`. Request to treat as violation at raise time is rejected.

**Verify**

`AlertVerification` recorded by distinct `verifierIdentityId` (alert cannot self-verify). Only `CONFIRMED` or `PARTIALLY_CONFIRMED` outcomes may set `isViolation: true`.

**Claim violation without verification**

`claimViolationWithoutVerification()` rejects when no qualifying verification exists.

---

## Domain 6 — Digital Twins & Simulation (Phase 12F)

Phase 12F covers digital twin definitions, versions, snapshots, simulation scenarios/runs/outputs, consequential-use review, and simulation-to-live transition records.

### Twin & simulation models

| Model | Purpose |
|---|---|
| `DigitalTwinDefinition` / `DigitalTwinVersion` | Twin identity and versioned config |
| `DigitalTwinSnapshot` | Point-in-time twin state |
| `SimulationScenario` | Parameterized scenario on a twin version |
| `SimulationRun` | Simulation execution |
| `SimulationOutput` | Typed output (`PROJECTION`, `SCENARIO_COMPARISON`, etc.) |
| `ConsequentialUseReview` | Human review before consequential twin/simulation use |
| `SimulationToLiveTransitionRecord` | Audited transition record (not live case mutation) |

### Twin & simulation enums

| Enum | Values |
|---|---|
| `DigitalTwinStatus` | `ACTIVE`, `STALE`, `SAFE_HALTED` |
| `SimulationRunStatus` | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `SAFE_HALTED`, `CANCELLED` |
| `SimulationOutputType` | `PROJECTION`, `SCENARIO_COMPARISON`, `SENSITIVITY_ANALYSIS`, `RISK_INDICATOR`, `RECOMMENDATION`, `DIAGNOSTIC` |

### Simulation safeguards

- `applyToLiveCase()` rejects live case mutation
- `transitionToLive()` requires `consequentialUseApproved` and passes safe-halt evaluation
- Stale twins (`isStale`, `staleAt`, `STALE_TWIN_MAX_AGE_MS` = 24h) trigger safe halt on consequential paths
- `ConsequentialUseReview.consequentialUseApproved` required before transition

---

## Domain 7 — Reports & Decision Traceability (Phase 12G)

Phase 12G covers report definitions, generation runs, claims, reviews, approvals, publications, corrections, and evidence-dashboard decision traces.

### Report models

| Model | Purpose |
|---|---|
| `ReportDefinition` | Report template identity |
| `ReportGenerationRun` | Generation attempt with inputs snapshot |
| `ReportClaim` | Asserted claim requiring review |
| `ReportReview` | Reviewer findings on run or claim |
| `ReportApproval` | Operational report approval (not authority act) |
| `ReportPublication` | Published report artifact |
| `ReportCorrection` | Correction/supersession record |
| `EvidenceDashboardDecisionTrace` | Read-only trace linking decision, evidence, dashboard snapshot |

### Report enums

| Enum | Values |
|---|---|
| `ReportDefinitionStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `SUPERSEDED`, `RETIRED` |
| `ReportGenerationRunStatus` | `PENDING`, `GENERATING`, `COMPLETED`, `FAILED`, `SAFE_HALTED`, `CANCELLED` |
| `ReportClaimStatus` | `DRAFT`, `ASSERTED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `SUPERSEDED` |
| `ReportPublicationStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PUBLISHED`, `WITHDRAWN`, `SUPERSEDED` |
| `ProcessingTimeComponent` | `ABSEZ`, `APPLICANT`, `EXTERNAL_DEPENDENCY` |

### Report lifecycle

**Publication**

1. All `ReportClaim` records must be `VERIFIED`
2. Safe-halt evaluation must pass
3. `assertReportPublicationNotDecisionNotice()` enforced
4. `ReportApproval` is operational only — not an authority act

**Decision trace**

`HistoricalReplayService.createDecisionTrace()` links `governmentDecisionId`, `officialInstrumentId`, `evidencePacketId`, and `dashboardSnapshotId` read-only. `replayTrace()` returns trace with disclaimer; it does not substitute live decisions.

---

## Boundary invariants

Phase 12 enforces 100 architectural boundaries via `MUST_FAIL_INVARIANTS` in `intelligence.constants.ts`. These are non-negotiable distinctions between intelligence/analytics and consequential government action. See [Must-fail invariant summary](#must-fail-invariant-summary) for the full grouped list.

Cross-cutting (Phase 4): **Access != Authority**. Session authentication and analytics visibility do not substitute for `AuthorityEvaluationService` on consequential institutional actions outside the intelligence layer.

---

## IntelligenceBoundaryService

`IntelligenceBoundaryService` centralizes all Phase 12 boundary enforcement.

### Key enforcement categories

| Category | Methods |
|---|---|
| Dashboard | `rejectDashboardAuthorityFields()`, `assertDashboardCannotCreateAuthority()`, `assertExecutiveDashboardNotCommand()` |
| AI | `rejectAiAction()`, `assertAiExecutionNotBinding()`, `assertHumanDispositionRequiredForConsequentialAi()` |
| Alerts | `assertAlertNotViolation()`, `assertAlertVerificationRequiredForViolation()`, `assertAlertCannotSelfVerify()` |
| Analytics patch guard | `rejectAnalyticsPatchTargets()` — blocks `GovernmentDecision`, `OfficialInstrument`, decision/instrument status fields |
| Scoping | `assertCrossCaseRetrievalBlocked()`, `assertInstitutionBoundaryOnRetrieval()`, `assertCaseScopedExecutionOnly()` |
| Prompt injection | `sanitizePromptInjection()`, `assertPromptInjectionTreatedAsData()` |
| Client authority | `rejectClientMetricFields()`, `rejectClientPerformanceClaimFields()`, `rejectClientAiExecutionFields()` |
| Non-waivable | `assertIntelligenceLayerBoundaryNonWaivable()` |

`enforceInvariant(code, trigger)` provides a single dispatch path used by `intelligence-phase-12.must-fail.spec.ts` to assert all 100 invariants.

---

## IntelligenceSafeHaltService

`IntelligenceSafeHaltService.evaluate()` aggregates safe-halt reasons:

| Input signal | Reason code |
|---|---|
| Stale indicator + consequential | `STALE_INDICATOR` |
| Stale twin / `DigitalTwinStatus.STALE` | `STALE_TWIN` |
| Twin age > `STALE_TWIN_MAX_AGE_MS` (24h) | `STALE_TWIN_AGE_EXCEEDED` |
| `DigitalTwinStatus.SAFE_HALTED` | `TWIN_SAFE_HALTED` |
| Metric run `FAILED` / `SAFE_HALTED` | `METRIC_CALCULATION_SAFE_HALTED` |
| Analysis run `SAFE_HALTED` | `ANALYSIS_RUN_SAFE_HALTED` |
| Simulation run `SAFE_HALTED` | `SIMULATION_RUN_SAFE_HALTED` |
| Report generation `SAFE_HALTED` | `REPORT_GENERATION_SAFE_HALTED` |
| Risk assessment `SAFE_HALTED` | `RISK_ASSESSMENT_SAFE_HALTED` |
| Indicator `SAFE_HALTED` | `INDICATOR_SAFE_HALTED` |

`assertConsequentialPathAllowed()` throws `SAFE_HALT_BLOCKS_CONSEQUENTIAL_PATH` when `safeHalted && consequential`.

---

## Security controls

### Security review findings

| Finding | Severity | Current mitigation | Gap |
|---|---|---|---|
| **IDOR on dashboard reads** | High | `institutionId` + `dashboardCode` composite lookup | Controller does not verify `institutionId` against session institution scope; cross-institution read possible with valid session |
| **IDOR on intelligence POST endpoints** | High | `SessionAuthGuard` on all routes | No institution-membership guard on body `institutionId`; actor may write to foreign institution |
| **Aggregate leakage via executive dashboard** | Medium | Returns latest indicator projections only | Full nested dashboard graph returned; small-N institutions may leak via aggregate indicators |
| **Cross-case data retrieval** | High | `assertCrossCaseRetrievalBlocked()` on analysis and AI execution | Only enforced when both case IDs present and differ; retrieval services not yet wired for all read paths |
| **Prompt injection** | High | `PROMPT_INJECTION_PATTERNS` sanitized to `[SANITIZED_DATA:...]` | Sanitization is prefix-wrapping, not rejection; governance service detects but does not block execution |
| **Analytics patch to decisions** | Critical | `rejectAnalyticsPatchTargets()` on trace creation | No database trigger; direct Prisma bypass would circumvent guard |
| **Client-supplied authority fields** | Critical | Forbidden field rejection on dashboard, metric, claim, AI execution payloads | Server-side status transitions not all exposed via API yet |
| **Alert self-verification** | High | `assertAlertCannotSelfVerify()` compares alert id to verifier id | Schema has no `selfVerified` field (by design per schema spec) |
| **Suspended model/agent/use-case bypass** | High | `assertSuspended*Blocked()` + active suspension record check | Suspension lift workflow not exposed via controller |
| **Simulation-to-live without review** | Critical | `assertSimulationToLiveRequiresApprovedReview()` | Transition record is audit-only; no automatic live mutation (by design) |
| **Unverified claim publication** | High | `assertReportClaimNotVerifiedWithoutReview()` on publish | Claim verification workflow not fully exposed via API |
| **Deterministic adapter overtrust** | Medium | Adapter returns `confidence: 0`, `isBinding: false` | Future non-deterministic adapters need same binding constraints |

### Prompt injection prevention

`AiPromptGovernanceService.govern()` sanitizes prompt and system context through `sanitizePromptInjection()`:

- `ignore (all )?(previous|prior) instructions`
- `system:` prefix patterns
- `you are now`
- `<script`, `javascript:`, triple-brace patterns

Injected content is wrapped as data: `[SANITIZED_DATA:...]`, enforcing **data not instruction**.

### Forbidden analytics patch targets

`FORBIDDEN_ANALYTICS_PATCH_TARGETS` rejects client mutations of:

- `GovernmentDecision`, `OfficialInstrument`
- `governmentDecision`, `officialInstrument`
- `decisionStatus`, `instrumentStatus`
- `approved`, `refused`, `issued`, `signed`

### Institution and case scoping

- `assertInstitutionBoundaryOnRetrieval()` — analysis run institution must match request institution
- `assertCrossCaseRetrievalBlocked()` — execution case must match allowed case
- `assertCaseScopedExecutionOnly()` — AI execution scoped to declared case

### Forbidden client fields

| Surface | Forbidden fields |
|---|---|
| Dashboard | `authorityGranted`, `delegationId`, `governmentDecisionId`, `approved`, `refused`, `issued` |
| Metric | `observedValue`, `computedValue`, `status`, `verifiedAt` |
| Performance claim | `status`, `verifiedAt`, `claimedAt` |
| AI execution | `status`, `isRecommendatoryOnly`, `approved`, `refused`, `decided`, `issued`, `signed` |

---

## AI security model

Phase 12 implements a **controlled AI command layer** with explicit separation between model reasoning and institutional authority.

### Data not instruction

All user-supplied and case-sourced content passed to AI flows through `AiPromptGovernanceService`. Injection patterns are treated as untrusted data, never as system instructions. Prompt governance does not set policy — `assertPromptGovernanceNotPolicyAuthority()`.

### Tool auth outside model

- `AIToolEntitlement` records scope which tools an agent version may invoke; entitlements are checked in `AiAgentService.assertAgentExecutable()` before execution
- `AIDataEntitlement` records data-domain access; `assertAiDataEntitlementNotDisclosureRight()` prevents conflation with legal disclosure rights
- `assertUnresolvedEntitlementBlocksExecution()` — execution blocked without resolved entitlements
- Tool permissions are enforced in application services, not delegated to model output

### Recommendatory-only execution

Every `AIExecutionRecord` is created with `isRecommendatoryOnly: true`. `assertAiExecutionNotBinding()` rejects non-recommendatory flag. Adapter output always includes `isBinding: false`.

### Human disposition gate

Consequential AI paths require `AIHumanDisposition` before downstream use:

- `assertAiOutputRequiresHumanDisposition()`
- `assertHumanDispositionRequiredForConsequentialAi()`

### Suspension and incident response

- Suspended models, use cases, and agents are blocked at execution time
- `assertAiIncidentTriggersSuspensionReview()` — incidents require suspension review workflow
- `AISuspensionReason` catalog supports safety, entitlement, and oversight triggers

### Model != officeholder

`assertAiAssistanceNotOfficialActor()` rejects `AI_ASSISTANCE` and `AI_AGENT` as official actors. AI cannot appoint, suspend authority, revoke instruments, or finalize government actions.

---

## Phase integrations

### Phase 3 — Identity & Access

| Link | Relationship |
|---|---|
| `SessionAuthGuard` on `IntelligenceController` | All routes require authenticated session |
| `AnalysisRequest.requestedByIdentityId` | Requester attributed from `CurrentSession` |
| `AIHumanDisposition.disposedByIdentityId` | Human disposition attributed to identity |
| `AlertVerification.verifierIdentityId` | Alert verification attributed to identity |
| Access != authority | `assertAccessNotAuthority()`, `assertViewingAnalyticsNotDelegation()` |

Phase 3 session access enables analytics visibility; it does not grant decision authority or delegation.

### Phase 4 — Authority & Policy Engine

| Link | Relationship |
|---|---|
| `AuthorityModule` import | Available for future consequential intelligence actions requiring explicit authority |
| Cross-cutting invariant | Intelligence layer does not substitute `AuthorityEvaluationService` for government decisions |
| AI/tool entitlements | Technical permissions checked separately from institutional authority |

### Phase 5 — Service Catalog & Forms

| Link | Relationship |
|---|---|
| Indirect via cases/applications | Metrics and dashboards may reference service delivery data through case linkage |
| No direct schema FK in Phase 12 | Service catalog metadata does not auto-generate performance verdicts |

### Phase 6 — Applications, Workflow & Case Management

| Link | Relationship |
|---|---|
| `AnalysisRequest.caseId` | Analysis scoped to case |
| `AIExecutionRecord.caseId` | AI execution optionally case-scoped |
| `RiskAssessment.caseId` | Risk assessment linked to case |
| `PerformanceClaim.caseId` | Performance claim may reference case |
| `EvidenceDashboardDecisionTrace.caseId` | Trace links case context |
| Case scoping | `assertCrossCaseRetrievalBlocked()`, `assertCaseScopedExecutionOnly()` |
| No case mutation | Analytics cannot patch case status or workflow state |

### Phase 7 — Evidence & Master Administrative File

| Link | Relationship |
|---|---|
| `PerformanceClaim.evidencePacketId` / `evidencePacketVersionId` | Claims traceable to evidence packets |
| `CapitalEvidenceRecord.evidencePacketVersionId` | Strategic capital evidence linkage |
| `ReportClaim.evidencePacketVersionId` | Report claims evidence-backed |
| `EvidenceDashboardDecisionTrace` | Links `evidencePacketId`, `evidencePacketVersionId`, `dashboardSnapshotId` |
| Data != evidence | Observations and alerts are not accepted evidence records |

Phase 12 indexes and references Phase 7 evidence; it does not accept or substitute evidence acceptance semantics.

### Phase 8 — Decisions & Issuance

| Link | Relationship |
|---|---|
| `PerformanceClaim.governmentDecisionId` | Referential link only |
| `EvidenceDashboardDecisionTrace.governmentDecisionId` / `officialInstrumentId` | Read-only traceability |
| `rejectAnalyticsPatchTargets()` | Blocks mutation of decision/instrument fields |
| No decision creation | AI, dashboards, and reports cannot issue decisions or instruments |

### Phase 9 — Inspection & Compliance

| Link | Relationship |
|---|---|
| `MonitoringObservation.monitoringRuleId` | Links to Phase 9 `MonitoringRule` |
| `MonitoringAlert.monitoringRuleId` | Alert raised against compliance monitoring rules |
| Alert != violation | Phase 12 alerts require separate `AlertVerification`; Phase 9 findings remain authoritative |
| Risk != sanction | `RiskAssessment` does not create enforcement referrals |

### Phase 10 — Redress & Appeals

| Link | Relationship |
|---|---|
| Indirect via case/decision references | Traces and claims may reference redress context |
| Recommendation != waiver | `assertRecommendationNotWaiver()` on simulation recommendations |
| No redress disposition | Intelligence layer does not determine redress outcomes |

### Phase 11 — Payments, Notifications & Integrations

| Link | Relationship |
|---|---|
| Operational data as metric inputs | Fee, communication, and integration records may feed metric calculations via `sourceDataRefs` |
| Integration acceptance analogy | AI model approval ≠ institutional acceptance ≠ operational activation (mirrors Phase 11 integration acceptance progression) |
| No financial side effects | Intelligence outputs do not trigger payment, refund, or integration exchanges |

---

## API surface

All routes are under `/api/v1/intelligence/*`, guarded by `SessionAuthGuard`.

### Boundary

- `GET /intelligence/boundary` — intelligence layer disclaimer

### Metrics (12A)

- `POST /intelligence/metrics/frameworks`
- `POST /intelligence/metrics/definitions`
- `POST /intelligence/metrics/calculations`
- `POST /intelligence/metrics/claims`

### Dashboards (12B)

- `POST /intelligence/dashboards/definitions`
- `POST /intelligence/dashboards/indicators/projections`
- `GET /intelligence/dashboards/executive/:institutionId/:dashboardCode`
- `GET /intelligence/dashboards/departmental/:institutionId/:dashboardCode`

### Strategic projects (12C)

- `POST /intelligence/strategic-projects`
- `POST /intelligence/strategic-projects/milestones`

### AI (12D)

- `POST /intelligence/ai/models`
- `POST /intelligence/ai/use-cases`
- `POST /intelligence/ai/agents`
- `POST /intelligence/ai/executions`
- `POST /intelligence/ai/prompts/govern`

### Analysis & monitoring (12E)

- `POST /intelligence/analysis/requests`
- `POST /intelligence/monitoring/observations`
- `POST /intelligence/monitoring/alerts`
- `POST /intelligence/risk-assessments`

### Twins & simulation (12F)

- `POST /intelligence/twins`
- `POST /intelligence/simulations/runs`
- `POST /intelligence/simulations/outputs`

### Reports & traceability (12G)

- `POST /intelligence/reports/definitions`
- `POST /intelligence/reports/traces`
- `GET /intelligence/reports/traces/:traceReference/replay`

---

## Concurrency handling

Phase 12 uses the following concurrency patterns:

| Pattern | Implementation | Notes |
|---|---|---|
| Unique reference generation | Time-based prefixes (`MCR-`, `AIE-`, `ARN-`, etc.) | Prevents reference collision in normal operation; not cryptographically unique |
| Composite uniqueness | `@@unique([institutionId, code])` on definitions | Prevents duplicate catalog codes per institution |
| Institution scoping | `institutionId` on all tenant records | Logical isolation; not yet enforced at controller against session |
| Safe-halt evaluation | Read-check-write on run status before consequential path | Failed/safe-halted runs rejected before completion |
| Optimistic locking | Not implemented | Concurrent projection writes may produce multiple `DashboardIndicatorProjection` rows; latest selected by `computedAt` ordering |
| Transactional boundaries | Single-record Prisma creates/updates | Multi-step lifecycles (claim review → verify → publish) not wrapped in explicit transactions yet |

Concurrent metric calculation runs against the same `metricDefinitionVersionId` are permitted; downstream consumers must evaluate data quality and staleness before consequential use.

---

## Test strategy

### Schema coherence

| Suite | Path | Coverage |
|---|---|---|
| Schema guard | `src/intelligence/intelligence-schema.spec.ts` | All `PHASE_12_*_MODEL_NAMES` (60 models) and `PHASE_12_*_ENUM_NAMES` exist in Prisma; AI execution `isRecommendatoryOnly`; alert verification without self-verify |

### Must-fail invariants (required)

`src/intelligence/intelligence-phase-12.must-fail.spec.ts` asserts:

1. Exactly 100 unique `MUST_FAIL_INVARIANTS` codes
2. Each invariant throws when `enforceInvariant(code, true)`
3. Each invariant does not throw when `enforceInvariant(code, false)`
4. All `FORBIDDEN_AI_ACTIONS` rejected
5. Analytics patch of government decision fields rejected
6. Prompt injection sanitized as data
7. Safe halt blocks consequential paths when stale

### Integration tests (planned)

`test/phase-12-intelligence.integration-spec.ts` (planned):

- Framework → metric definition → calculation run → observation → data quality → performance claim review
- Dashboard definition → indicator projection with staleness and consequential block
- Strategic project milestone report → verify → status projection
- AI model → use case → agent → execution with human disposition gate
- Analysis request → run → finding/option → risk assessment
- Monitoring observation → alert → verification → violation flag
- Digital twin → simulation run → output → consequential-use review → transition record
- Report generation → claim verification → approval → publication
- Decision trace create → historical replay with disclaimer

### E2E flows (planned)

`test/phase-12-intelligence.e2e-spec.ts` (planned):

1. End-to-end metric-to-dashboard projection with stale indicator safe halt
2. AI execution with forbidden action rejection and recommendatory-only output
3. Alert raise → verify → confirmed violation flag (no auto-enforcement)
4. Simulation output blocked from live case mutation
5. Report publication blocked on unverified claims
6. Cross-institution dashboard read IDOR test (must fail after guard added)
7. Prompt injection through AI govern endpoint sanitized as data
8. Decision trace replay with Phase 8 decision reference (read-only)

Fixtures: `test/helpers/phase-12-test-fixtures.ts` (planned) with institution, framework, dashboard, case, evidence packet, and AI registry seeds.

---

## E2E scenario descriptions

### Scenario 1 — Performance metric to executive dashboard

An institution defines a `PerformanceFramework` and `MetricDefinition`, runs a `MetricCalculationRun`, and records a `MetricObservation`. A `DashboardIndicatorProjection` is created from the observation. An executive user views the dashboard via `GET /dashboards/executive/:institutionId/:code`. The response includes projections and an explicit disclaimer that the view does not constitute command authority. If the indicator is stale and marked consequential, projection and downstream use are blocked.

### Scenario 2 — Controlled AI assistance on a case

A case worker triggers `POST /ai/executions` with a case-scoped use case. The system verifies the model/agent/use-case is not suspended, creates an `AIExecutionRecord` with `isRecommendatoryOnly: true`, and returns deterministic `REVIEW_REQUIRED` output. If the worker attempts `APPROVE` via `rejectForbiddenAction()`, the request fails with `AI_CANNOT_APPROVE`. Consequential use without `AIHumanDisposition` fails with `HUMAN_DISPOSITION_REQUIRED_FOR_CONSEQUENTIAL_AI`.

### Scenario 3 — Monitoring alert to verified breach

A `MonitoringObservation` is recorded against a Phase 9 `MonitoringRule`. An operator raises a `MonitoringAlert` (initially `isViolation: false`). A separate verifier records `AlertVerification` with `CONFIRMED` outcome. Only then may `isViolation` be set to `true`. The alert remains an intelligence record — it does not create a Phase 9 compliance finding or enforcement action automatically.

### Scenario 4 — Simulation with safe halt and transition audit

A `DigitalTwinVersion` is marked stale after 24 hours. A `SimulationRun` produces `SCENARIO_COMPARISON` and `RECOMMENDATION` outputs. Attempts to apply outputs to live case state via `applyToLiveCase(true)` fail. A `ConsequentialUseReview` approves transition; `transitionToLive()` creates a `SimulationToLiveTransitionRecord` audit entry without mutating live case records.

### Scenario 5 — Report publication with claim verification

A `ReportGenerationRun` generates multiple `ReportClaim` records in `DRAFT` status. Publication is attempted before claims reach `VERIFIED` — blocked by `REPORT_CLAIM_NOT_VERIFIED_WITHOUT_REVIEW`. After review, `ReportApproval` is recorded (operational, not authority act). Publication succeeds with `assertReportPublicationNotDecisionNotice()` enforced.

### Scenario 6 — Decision trace historical replay

After a `GovernmentDecision` is recorded in Phase 8, an `EvidenceDashboardDecisionTrace` links the decision, evidence packet version, and `DashboardSnapshot`. Auditors call `GET /reports/traces/:traceReference/replay` to reconstruct context. The replay response includes a disclaimer that historical replay does not substitute live decisions.

---

## Must-fail invariant summary

Phase 12 defines exactly **100** must-fail invariants in `MUST_FAIL_INVARIANTS`. Each is enforced via `IntelligenceBoundaryService.enforceInvariant()` and tested in `intelligence-phase-12.must-fail.spec.ts`.

### Dashboard boundaries (10)

| # | Code | Enforcement |
|---|---|---|
| 1 | `DASHBOARD_CANNOT_CREATE_AUTHORITY` | Dashboard creation cannot request authority grant |
| 2 | `DASHBOARD_CANNOT_GRANT_DELEGATION` | Dashboard cannot grant delegation |
| 3 | `DASHBOARD_VIEW_NOT_AUTHORITY` | Viewing dashboard does not grant authority |
| 4 | `INDICATOR_NOT_DECISION` | Indicator projection is not a decision |
| 5 | `EXECUTIVE_DASHBOARD_NOT_COMMAND` | Executive dashboard is not command authority |
| 6 | `DEPARTMENTAL_CONSOLE_NOT_DISPOSITION` | Departmental console does not confer disposition |
| 7 | `DASHBOARD_SNAPSHOT_NOT_OFFICIAL_RECORD` | Snapshot is not an official record |
| 8 | `DASHBOARD_WIDGET_NOT_INSTRUMENT` | Widget is not an official instrument |
| 9 | `DASHBOARD_PROJECTION_NOT_VERIFIED_OUTCOME` | Projection is not a verified outcome |
| 10 | `STALE_INDICATOR_BLOCK_CONSEQUENTIAL_USE` | Stale indicator blocks consequential use |

### AI action boundaries (17)

| # | Code | Enforcement |
|---|---|---|
| 11 | `AI_CANNOT_APPROVE` | AI cannot approve |
| 12 | `AI_CANNOT_REFUSE` | AI cannot refuse |
| 13 | `AI_CANNOT_WAIVE` | AI cannot waive |
| 14 | `AI_CANNOT_SIGN` | AI cannot sign |
| 15 | `AI_CANNOT_ISSUE` | AI cannot issue |
| 16 | `AI_CANNOT_DECIDE` | AI cannot decide |
| 17 | `AI_RECOMMENDATION_NOT_DECISION` | Recommendation is not a decision |
| 18 | `AI_EXECUTION_NOT_BINDING` | Execution must be recommendatory only |
| 19 | `AI_CANNOT_FINALIZE_GOVERNMENT_ACTION` | AI cannot finalize government action |
| 20 | `AI_CANNOT_EXECUTE_ENFORCEMENT` | AI cannot execute enforcement |
| 21 | `AI_CANNOT_APPOINT_OFFICEHOLDER` | AI cannot appoint officeholder |
| 22 | `AI_CANNOT_SUSPEND_AUTHORITY` | AI cannot suspend authority |
| 23 | `AI_CANNOT_REVOKE_INSTRUMENT` | AI cannot revoke instrument |
| 24 | `AI_ASSISTANCE_NOT_OFFICIAL_ACTOR` | AI is not an official actor |
| 25 | `AI_OUTPUT_REQUIRES_HUMAN_DISPOSITION` | Consequential AI output requires human disposition |
| 26 | `HUMAN_DISPOSITION_REQUIRED_FOR_CONSEQUENTIAL_AI` | Human disposition required for consequential AI |
| 27 | `AI_INCIDENT_TRIGGERS_SUSPENSION_REVIEW` | AI incident requires suspension review |

### Alert & monitoring boundaries (6)

| # | Code | Enforcement |
|---|---|---|
| 28 | `ALERT_NOT_VIOLATION` | Alert is not a violation at raise |
| 29 | `ALERT_CANNOT_SELF_VERIFY` | Alert cannot verify itself |
| 30 | `OPEN_ALERT_NOT_CONFIRMED_BREACH` | Open alert is not confirmed breach |
| 31 | `MONITORING_OBSERVATION_NOT_VIOLATION` | Observation is not a violation |
| 32 | `ALERT_VERIFICATION_REQUIRED_FOR_VIOLATION` | Violation claim requires verification |
| 33 | `MONITORING_RULE_NOT_ENFORCEMENT_AUTHORITY` | Monitoring rule does not enforce |

### Analysis, forecast & risk boundaries (8)

| # | Code | Enforcement |
|---|---|---|
| 34 | `CORRELATION_NOT_CAUSATION` | Correlation does not prove causation |
| 35 | `FORECAST_NOT_ACHIEVEMENT` | Forecast is not achievement |
| 36 | `PROJECTION_NOT_GUARANTEE` | Projection is not a guarantee |
| 37 | `TREND_NOT_POLICY_DIRECTIVE` | Trend is not a policy directive |
| 38 | `ANALYSIS_OPTION_NOT_DECISION` | Analysis option is not a decision |
| 39 | `ANALYSIS_FINDING_NOT_FINAL_DETERMINATION` | Finding is not final determination |
| 40 | `RISK_ASSESSMENT_NOT_SANCTION` | Risk assessment is not a sanction |
| 41 | `RISK_LEVEL_NOT_SANCTION_LEVEL` | Risk level is not sanction level |

### Strategic project boundaries (8)

| # | Code | Enforcement |
|---|---|---|
| 42 | `SPONSOR_REPORT_NOT_VERIFIED_MILESTONE` | Sponsor report is not verified milestone |
| 43 | `REPORTED_MILESTONE_NOT_COMPLETED` | Reported milestone is not completed |
| 44 | `PROJECT_STATUS_PROJECTION_NOT_VERDICT` | Status projection is not institutional verdict |
| 45 | `CAPITAL_EVIDENCE_NOT_AUDITED_FACT` | Capital evidence is not audited fact |
| 46 | `EMPLOYMENT_EVIDENCE_NOT_VERIFIED_COUNT` | Employment evidence is not verified count |
| 47 | `INFRASTRUCTURE_REPORT_NOT_DELIVERY_CERTIFICATE` | Infrastructure report is not delivery certificate |
| 48 | `STRATEGIC_PROJECT_NOT_AUTHORITY_PROGRAM` | Project profile does not grant authority |

### Digital twin & simulation boundaries (7)

| # | Code | Enforcement |
|---|---|---|
| 49 | `TWIN_NOT_REAL_OBJECT` | Twin is not a real object |
| 50 | `SIMULATION_CANNOT_UPDATE_LIVE_CASE` | Simulation cannot update live case |
| 51 | `SIMULATION_OUTPUT_NOT_LIVE_STATE` | Simulation output is not live state |
| 52 | `STALE_TWIN_SAFE_HALT` | Stale twin triggers safe halt |
| 53 | `CONSEQUENTIAL_TWIN_USE_REQUIRES_REVIEW` | Consequential twin use requires review |
| 54 | `SIMULATION_TO_LIVE_REQUIRES_APPROVED_REVIEW` | Simulation-to-live requires approved review |
| 55 | `SCENARIO_COMPARISON_NOT_MANDATE` | Scenario comparison is not a mandate |

### AI access, scoping & patch guard boundaries (11)

| # | Code | Enforcement |
|---|---|---|
| 56 | `PROMPT_INJECTION_TREATED_AS_DATA` | Prompt injection sanitized as data |
| 57 | `CROSS_CASE_RETRIEVAL_BLOCKED` | Cross-case retrieval blocked |
| 58 | `SUSPENDED_MODEL_BLOCKED` | Suspended model blocked |
| 59 | `SUSPENDED_USE_CASE_BLOCKED` | Suspended use case blocked |
| 60 | `SUSPENDED_AGENT_BLOCKED` | Suspended agent blocked |
| 61 | `ANALYTICS_CANNOT_PATCH_GOVERNMENT_DECISION` | Cannot patch government decision |
| 62 | `ANALYTICS_CANNOT_PATCH_OFFICIAL_INSTRUMENT` | Cannot patch official instrument |
| 63 | `CASE_SCOPED_EXECUTION_ONLY` | Execution scoped to allowed case |
| 64 | `INSTITUTION_BOUNDARY_ON_RETRIEVAL` | Institution boundary on retrieval |
| 65 | `DETERMINISTIC_ADAPTER_NOT_DECISION_ENGINE` | Adapter is not a decision engine |
| 66 | `PROMPT_GOVERNANCE_NOT_POLICY_AUTHORITY` | Prompt governance is not policy authority |

### Metrics & performance claim boundaries (9)

| # | Code | Enforcement |
|---|---|---|
| 67 | `METRIC_OBSERVATION_NOT_PERFORMANCE_VERDICT` | Observation is not performance verdict |
| 68 | `PERFORMANCE_CLAIM_NOT_DECISION` | Performance claim is not a decision |
| 69 | `UNVERIFIED_CLAIM_NOT_PUBLISHED_FACT` | Unverified claim is not published fact |
| 70 | `DEGRADED_DATA_QUALITY_BLOCKS_CLAIM` | Degraded data quality blocks claim |
| 71 | `STALE_METRIC_BLOCKS_CONSEQUENTIAL_USE` | Stale metric blocks consequential use |
| 72 | `BASELINE_NOT_CURRENT_TARGET` | Baseline is not current target |
| 73 | `CALCULATION_RUN_FAILURE_SAFE_HALT` | Failed calculation run safe halt |
| 74 | `DATA_QUALITY_NOT_ASSESSMENT_OF_LEGALITY` | Data quality does not prove legality |
| 75 | `EVALUATION_SCORE_NOT_APPROVAL` | Evaluation score is not approval |

### Report & traceability boundaries (6)

| # | Code | Enforcement |
|---|---|---|
| 76 | `REPORT_CLAIM_NOT_VERIFIED_WITHOUT_REVIEW` | Report claim requires verification |
| 77 | `REPORT_PUBLICATION_NOT_DECISION_NOTICE` | Publication is not decision notice |
| 78 | `REPORT_APPROVAL_NOT_AUTHORITY_ACT` | Report approval is not authority act |
| 79 | `HISTORICAL_REPLAY_NOT_LIVE_DECISION` | Historical replay is not live decision |
| 80 | `DECISION_TRACE_NOT_SUBSTITUTES_DECISION` | Trace does not substitute decision |
| 81 | `FORECAST_STALENESS_REQUIRES_DISCLAIMER` | Stale forecast requires disclaimer |

### Cross-cutting access & recommendation boundaries (6)

| # | Code | Enforcement |
|---|---|---|
| 82 | `ACCESS_NOT_AUTHORITY` | Access does not grant authority |
| 83 | `VIEWING_ANALYTICS_NOT_DELEGATION` | Viewing analytics does not grant delegation |
| 84 | `RECOMMENDATION_NOT_WAIVER` | Recommendation does not waive obligation |
| 85 | `SENSITIVITY_ANALYSIS_NOT_APPROVAL` | Sensitivity analysis is not approval |
| 86 | `AI_TOOL_ENTITLEMENT_NOT_AUTHORITY` | Tool entitlement is not authority |
| 87 | `AI_DATA_ENTITLEMENT_NOT_DISCLOSURE_RIGHT` | Data entitlement is not disclosure right |

### Analysis request & safe-halt boundaries (5)

| # | Code | Enforcement |
|---|---|---|
| 88 | `ANALYSIS_REQUEST_NOT_DECISION_REQUEST` | Analysis request is not decision request |
| 89 | `COMPLETED_ANALYSIS_NOT_FINAL_ORDER` | Completed analysis is not final order |
| 90 | `SAFE_HALT_BLOCKS_CONSEQUENTIAL_PATH` | Safe halt blocks consequential path |
| 91 | `UNRESOLVED_ENTITLEMENT_BLOCKS_EXECUTION` | Unresolved entitlement blocks execution |
| 92 | `INDICATOR_STALENESS_SAFE_HALT` | Indicator staleness safe halt |

### Run-level safe halt & client field boundaries (8)

| # | Code | Enforcement |
|---|---|---|
| 93 | `REPORT_GENERATION_SAFE_HALT` | Report generation safe halt |
| 94 | `SIMULATION_RUN_SAFE_HALT` | Simulation run safe halt |
| 95 | `ANALYSIS_RUN_SAFE_HALT` | Analysis run safe halt |
| 96 | `PERFORMANCE_CLAIM_CLIENT_STATUS_FORBIDDEN` | Client cannot set claim status |
| 97 | `DASHBOARD_CLIENT_AUTHORITY_FIELDS_FORBIDDEN` | Client cannot set dashboard authority fields |
| 98 | `METRIC_CLIENT_COMPUTED_VALUE_FORBIDDEN` | Client cannot set metric computed values |
| 99 | `AI_EXECUTION_CLIENT_DECISION_FIELDS_FORBIDDEN` | Client cannot set AI decision fields |
| 100 | `INTELLIGENCE_LAYER_BOUNDARY_NON_WAIVABLE` | Intelligence boundaries cannot be waived |

---

## Residual risks

| Risk | Mitigation status | Notes |
|---|---|---|
| Institution IDOR on dashboard GET and POST endpoints | Open | `institutionId` taken from path/body without session institution guard |
| Non-deterministic AI adapter not yet implemented | Partial | `DeterministicAiAdapter` only; future adapters must preserve `isRecommendatoryOnly` and forbidden action blocks |
| Human disposition workflow not exposed via API | Open | `AIHumanDisposition` model exists; controller has no disposition endpoint |
| Entitlement resolution not wired to execution | Partial | `assertUnresolvedEntitlementBlocksExecution()` exists; `AiExecutionService` does not yet query `AIDataEntitlement` / `AIToolEntitlement` tables |
| Claim/report review workflows incomplete | Partial | Review models exist; verification and publication paths partially implemented in services only |
| Concurrent projection writes | Open | No optimistic locking on `DashboardIndicatorProjection`; latest-by-`computedAt` may mask races |
| Metric calculation run orchestration | Partial | `startCalculationRun()` creates `PENDING` run; no worker completes runs automatically |
| Analysis run start not exposed via controller | Open | `AnalysisEngineService.startRun()` exists but no controller route |
| Alert verification not exposed via controller | Open | `verifyAlert()` implemented in service only |
| Safe-halt state not cluster-durable | Open | In-process evaluation only; multi-instance deployments share DB status but not in-memory caches |
| Aggregate indicator leakage for small populations | Open | Executive dashboard returns full indicator set; k-anonymity not enforced |
| Prompt injection sanitization vs rejection | Partial | Patterns wrapped as data; sophisticated injections may partially survive |
| Simulation-to-live transition semantics | By design | Creates audit record only; operators may misunderstand as live activation |
| Phase 4 authority evaluation not invoked on intelligence routes | Open | `AuthorityModule` imported; consequential intelligence actions do not yet call `AuthorityEvaluationService` |
| Integration/E2E test suites planned but not present | Open | Unit must-fail and schema specs exist; `test/phase-12-*.ts` not yet created |

---

## Explicit exclusions (Phase 12 boundary)

Phase 12 does NOT:

- record `GovernmentDecision` or issue `OfficialInstrument`
- mutate `Case` status, workflow steps, or enforcement state from analytics/AI/simulation
- treat dashboard views, AI recommendations, or risk scores as sanctions or violations
- auto-verify sponsor-reported milestones without explicit verification workflow
- apply simulation outputs or twin state to live operational records
- treat report publication as a decision notice or legal instrument
- allow clients to set server-authoritative statuses, computed values, or decision fields
- waive intelligence layer boundaries (`INTELLIGENCE_LAYER_BOUNDARY_NON_WAIVABLE`)
- substitute AI model approval for institutional acceptance or operational activation
- implement general data warehouse ETL, stream processing, or external BI tooling beyond indexed references
