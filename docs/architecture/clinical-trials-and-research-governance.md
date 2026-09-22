# Clinical Trial Registry & Clinical Research Enrollment Governance

## Objective

Support government-approved or authorized clinical research programs where citizens can discover trials, express interest, authorize screening, receive professional eligibility review, enroll, withdraw, and track participation—without software substituting for clinical, safety, or research-ethics judgment.

## Canonical module

All clinical research foundation logic lives under `src/healthcare/research/`.

## Critical safety principle

Software may assist with discovery, matching, workflow, consent administration, evidence collection, and coordination.

Software must **not** autonomously determine clinical eligibility, medical safety, treatment appropriateness, or research-ethics outcomes where professional or institutional judgment is required.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **ClinicalTrial listing** | What public discovery facts are published? (not regulatory approval) |
| **ResearchEthicsApproval** | What governed ethics committee record exists? (not sponsor self-attestation) |
| **ClinicalRegulatoryApproval** | What regulatory authorization status exists? (distinct from ethics) |
| **ClinicalTrialInterest** | Did a citizen express interest? (not enrollment) |
| **PreliminaryTrialMatchingService** | Is there a preliminary informational match? (not clinical eligibility) |
| **ClinicalTrialScreening / ScreeningReview** | What authorized screening workflow occurred? |
| **ClinicalTrialEligibilityAssessment** | What professional eligibility determination was recorded? |
| **ClinicalTrialConsentSignature** | What informed consent was captured? (not enrollment) |
| **ClinicalTrialEnrollment** | What governed enrollment was recorded under explicit protocol/consent versions? |
| **ClinicalTrialWithdrawal** | How did participation end while preserving history? |

## Explicit boundaries

- Trial listing ≠ regulatory approval
- Trial discovery ≠ recommendation to participate
- Preliminary match ≠ clinical eligibility (`PreliminaryTrialMatchOutcome` never emits `ELIGIBLE`)
- Patient interest ≠ enrollment (`interestIsNotEnrollment`)
- Consent ≠ enrollment (`consentIsNotEnrollment`)
- Eligibility ≠ enrollment (both required)
- Enrollment ≠ treatment success (`participationIsNotTreatment`)
- Research participation ≠ routine medical treatment
- AI matching ≠ clinical decision (forbidden AI actions include `FINALIZE_ELIGIBILITY`)
- Ethics approval ≠ regulatory approval

## Trial lifecycle

`ClinicalTrialListingLifecycleStatus` includes draft through archived states (for example `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED_FOR_LISTING`, `RECRUITING`, `SUSPENDED`, `COMPLETED`, `ARCHIVED`). These are operational listing states mapped to jurisdiction or institution policy—not standalone legal determinations.

## Protocol and consent versioning

- `ClinicalTrialProtocolVersion` becomes immutable after activation (`isImmutable`).
- Amendments create new protocol versions; enrollments store the exact `protocolVersionId` and `consentVersionId` used at enrollment time.

## Ethics and regulatory governance

- `ResearchEthicsApproval` records committee-governed ethics status; `sponsorSelfApprovalForbidden` defaults to true.
- `ClinicalRegulatoryApproval` and `ClinicalRegulatoryStatus` track regulatory authorization separately.
- Enrollment gates honor configured blocks when ethics or regulatory status is inactive, expired, or suspended.

## Discovery API

Public discovery is exposed at `GET /public/clinical-trials/discover` and returns only citizen-safe trial metadata (condition category, age range, recruitment status, location summary, phase, sponsor, broad criteria). Participant identities and enrollment rows are excluded by design.

## Enrollment prerequisites

`ClinicalTrialEnrollmentService` requires, when configured:

- recruiting trial (not suspended)
- active site
- active protocol version
- active consent version and signed consent
- professional eligibility assessment outcome `DETERMINED_MEETS_PROFESSIONAL_CRITERIA`
- active ethics and regulatory status where blocking flags apply

## Withdrawal

`ClinicalTrialWithdrawal` records auditable withdrawal reasons while retaining enrollment and status history (`preservesParticipationHistory`).

## Integrations

Clinical research coordinates with HeartStone identity (participant subject identity), government structure (sites, investigators, ethics institutions), evidence references (screening and eligibility evidence), and future case/workflow layers without collapsing research participation into medical treatment records.
