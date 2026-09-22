# Healthcare Consent, Data Registry, Safety, and Interoperability

HeartStone healthcare foundation separates **identity**, **consent**, **legal/administrative access basis**, **clinical safety reporting**, and **integration exchange state**. None of these are interchangeable.

## Consent and purpose management

- `HealthcareConsent` records are **purpose-bound**, **scope-bound**, and **versioned** via `HealthcareConsentVersion`.
- `HealthcareConsentGrant` authorizes a specific `HealthcareConsentPurposeDefinition`; withdrawal creates `HealthcareConsentWithdrawal` and deactivates the grant **without deleting** historical consent records.
- `HealthcareAccessBasisKind` distinguishes patient consent from non-consent bases (`LEGAL_AUTHORITY`, `ADMINISTRATIVE`, `TREATMENT_RELATIONSHIP`, `EMERGENCY`, `RESEARCH_APPROVAL`, `PUBLIC_HEALTH`).
- `representsPatientConsent` must not be set when the basis is not `PATIENT_CONSENT`.

Runtime enforcement uses `HealthcareDataAccessPolicyService` with actor identity from canonical `ActorContext`. Client-supplied `patientReferenceId` is a resource identifier only.

## Health data registry

The registry stores **references and provenance**, not full external EHR documents:

- `HealthDataRecordReference`, `HealthDataProvenance`, `HealthDataVersionReference`
- Access and disclosure history via `HealthDataAccessRecord` and `HealthDataDisclosureRecord`
- Classification (`HealthcareDataClassification`) gates sensitive categories (genetic, mental health, HIV, substance use, reproductive, sealed)

## Research data governance

Research access is dataset-scoped (`ResearchDataset`, `ResearchDatasetVersion`, `ResearchDataAccessGrant`) with ethics/protocol references, expiry, and revocation. Pseudonymization state is explicit (`ResearchPseudonymizationState`); **`claimsAnonymous` defaults false** and direct identifier removal alone does not imply anonymity.

## Clinical safety

`AdverseEventReport` captures allegations. Causality is tracked separately in `AdverseEventAssessment` and only updated through professional assessment. AI may assist triage (`aiAssistedTriageOnly`) but **cannot** establish causality. Safety records cannot be silently deleted.

## Regulatory oversight references

Healthcare domains link to the general compliance engine through references (`HealthcareComplianceMatterReference`, `HealthcareInspectionReference`) rather than duplicating compliance logic.

## Interoperability gateway extensions

`HealthcareIntegrationAdapterDeclaration` declares capability and version intent for standards such as FHIR, laboratory, EHR, pharmacy, imaging, research, payer, and government registries. Adapter naming **does not** assert compliance.

Inbound exchanges record provenance on `HealthcareIntegrationExchangeRecord`. Divergence creates or links `SourceDiscrepancy` instead of silently overwriting authoritative local state. Failed exchanges remain `succeeded: false`.

## Security invariants

- `HealthcareDataAccessPolicyService` audits sensitive access via `HealthcareDataAccessAudit`.
- Bulk enumeration and platform-admin bypass are denied at the healthcare boundary.
- External providers are constrained to authorized organizational scope.

See also: `healthcare-registry-and-health-identity.md`, `clinical-trials-and-research-governance.md`, `medical-treatment-programs.md`.
