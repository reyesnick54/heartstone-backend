# Clinical Trials and Research Data Governance

HeartStone research governance enforces **minimum necessary** dataset access with explicit purpose limitation and time bounds.

## Core entities

- `ResearchDataPurpose` — governed purpose codes for datasets and approvals
- `ResearchDataset` / `ResearchDatasetVersion` — versioned dataset definitions with ethics and protocol references
- `ResearchDataUseRequest` / `ResearchDataUseApproval` — governed approval workflow metadata
- `ResearchDataAccessGrant` — researcher-specific grant with expiry and revocation
- `ResearchDataPseudonymizationRecord` — tracks pseudonymization/de-identification state and provenance

## Boundaries

| Rule | Enforcement |
| --- | --- |
| Researcher access ≠ unrestricted patient access | Grants scope dataset record links only |
| Purpose limitation | Dataset bound to `ResearchDataPurpose` |
| Expiry / revocation | `ResearchDataAccessGrantStatus` and `expiresAt` |
| Pseudonymization ≠ anonymity | `claimsAnonymous` false by default; provenance retained |
| Auditability | Access attempts outside dataset membership are denied |

Research consent (`HealthcareResearchConsent`) complements platform consent grants for trial/protocol-specific participation.

Implementation services live under `src/healthcare/research/`.
