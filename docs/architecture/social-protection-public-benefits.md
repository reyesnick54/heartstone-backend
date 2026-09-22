# Social Protection, Public Benefits & Citizen Support Foundation

## Objective

Provide a jurisdiction-neutral social protection architecture for benefit programs, household composition, applications, eligibility assessments, authoritative awards, renewals, suspensions, terminations, payment coordination, and appeals — without encoding any particular national means test, disability criteria, or poverty line. Substantive eligibility arrives through **Government Service Packs**, **Authority**, and **GovernmentDecision** flows.

## Canonical module

All social protection foundation logic lives under `src/social-protection/`.

## Conceptual separation

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **BenefitApplicationProfile** | Case-linked benefit request context | Benefit award or eligibility outcome |
| **BenefitEligibilityAssessment** | Deterministic or configured assessment record | Authoritative award |
| **BenefitAward** | Government benefit outcome | Payment execution |
| **BenefitPaymentScheduleReference / BenefitDisbursementReference** | Links to Phase 11 financial rails | Continuing eligibility |
| **HouseholdRecord / HouseholdRelationship** | Configurable household composition | Family, shared address, or shared finances |
| **HouseholdIncomeDeclaration / HouseholdAssetDeclaration** | Self-declared reporting | Verified government fact |
| **ExternalEligibilityDeterminationReference** | External authority outcome | Applicant-submitted proof |
| **SocialProtectionAppealReference** | Redress linkage for benefit decisions | Replacement of original decision record |

## Program configuration

- **BenefitCategory** and **BenefitProgram** describe program taxonomy (income support, housing, food assistance, etc.) without hard-coded statutory rules.
- **BenefitProgramVersion** references configured `eligibilityRuleVersionReference`, optional `governmentServiceVersionId`, and flags such as `humanDecisionRequired` and `workflowPermitsAutoAward` (default false).

## Household model

- Households are **not** assumed to equal families, addresses, or shared finances.
- **HouseholdRelationship** uses configurable `relationshipTypeCode`, optional evidence linkage, and explicit flags (`isSharedFinances`, `isSpouseAssumption` default false).

## Eligibility

- **ConfigurableBenefitEligibilityEngine** produces preliminary, deterministic assessment output only.
- **BenefitEligibilityAssessment** records program version, rule version, input facts, evidence references, external determinations, and whether human decision is required.
- Automated rules may calculate preliminary eligibility; they **must not** bypass configured human decision requirements or create awards unless `workflowPermitsAutoAward` is explicitly true.

## Awards and lifecycle

- **BenefitAward** is an authoritative government outcome linked to optional **GovernmentDecision**.
- **BenefitAwardVersion** preserves amount, duration, and condition changes; destructive overwrite is forbidden.
- **BenefitSuspension** requires configured authority evidence (`functionAuthorityRecordId`, `authorityEvaluationRecordId`, or `governmentDecisionId`).
- Risk or anomaly scores must not automatically terminate benefits.

## Payments

Reuse Phase 11 **Invoice** and **PaymentTransaction** infrastructure via reference models only. Disbursement and schedule references carry `doesNotDetermineEligibility` defaults.

## Access control

`SocialProtectionAccessService` enforces:

- applicant self-access to own household
- representative scope via active `RepresentativeAuthority`
- caseworker cross-program boundaries

## API surface (foundation)

- `POST /api/v1/social-protection/applicant-profiles`
- `POST /api/v1/social-protection/household-records`
- `POST /api/v1/social-protection/benefit-application-profiles`
- `POST /api/v1/social-protection/eligibility-assessments/preliminary`
- `POST /api/v1/social-protection/benefit-awards`

## Non-goals (foundation boundary)

This foundation does **not**:

- encode jurisdiction-specific benefit eligibility statutes
- infer disability, poverty, unemployment, or other sensitive status from unrelated data
- treat applications, payments, or AI guidance as awards or eligibility facts
- duplicate generic Application or Payment models
