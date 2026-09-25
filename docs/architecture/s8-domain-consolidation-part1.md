# S8 Remediation — Domain Consolidation (Part 1)

## Objective

Eliminate duplicate active implementations for citizen experience composition, official-instrument verification, and appeals/redress coordination semantics.

## Canonical boundaries

| Concept | Canonical module | Retired / subordinate |
|---|---|---|
| Citizen experience HTTP surface | `src/experience/citizen/` (`ExperienceModule` → `CitizenExperienceModule`) | Root `src/citizen-experience/` (removed) |
| Citizen dashboard & guided start | `src/experience/citizen/services/` | — |
| Citizen read projections (documents, credentials, payments, messages, renewals, civil registry) | `src/experience/citizen/projections/` | — |
| Initial issuance & delivery | `src/decisions-issuance/` | Domain `*CertificateService` extract/link helpers only |
| Post-issuance lifecycle transitions | `src/instruments/lifecycle/instrument-lifecycle.service.ts` | — |
| Public verification API & records | `src/decisions-issuance/verification/instrument-verification.service.ts` | — |
| Lifecycle verification cache on `OfficialInstrument` | `src/instruments/lifecycle/instrument-public-verification-cache.service.ts` | Former duplicate `InstrumentVerificationService` in instruments |
| Appeals, reconsideration, redress | `src/redress/` (`RedressMatter`, proceedings, external review) | Experience views compose redress; domain appeal references link in |
| Active redress matter filter | `src/redress/common/active-redress-matter-statuses.constants.ts` | Duplicated status arrays in experience services |

## Citizen experience rule

The citizen experience layer **composes** canonical backend domains. It does not host government business logic, decision execution, or issuance lifecycle mutations.

All authenticated citizen routes remain under `/api/v1/experience/citizen/...` on the unified `CitizenExperienceController`.

## Certificate vs official instrument

Domain modules may expose certificate **extracts** or registry **artifacts** (civil registry, property, corporate registry) that reference `OfficialInstrument` and `IssuanceEvent`. Those services do not define a second government issuance lifecycle.

Authentication credentials and professional credentials remain outside government permit/license issuance unless explicitly catalogued as instrument types.

## Appeals / redress rule

`RedressMatter` is the canonical coordination container for complaint, reconsideration, internal review, and external/statutory redress pathways. Domain-specific appeal reference models (for example social protection benefit appeals, development planning appeals) **link** to redress and preserve original decision records; they do not replace `GovernmentDecision` history.

Operational complaints (for example employment complaints) may reference `redressMatterId` but do not implement a parallel redress engine.

## API compatibility

No route prefixes changed in Part 1. The duplicate Nest module registration at `AppModule` for root `CitizenExperienceModule` was removed; routes are served only through `ExperienceModule`.
