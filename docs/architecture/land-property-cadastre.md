# Land, Property & Cadastre

## Objective

Provide a jurisdiction-neutral architecture for government administration of land parcels, administrative property records, title registry state, recorded interests, transfers, encumbrances, surveys, valuations, and property-registry functions. Legal effect, eligibility, and disclosure policy are supplied through **Government Service Packs** and **authenticated governing sources** — not hard-coded national property law.

## Canonical module

All property registry domain logic lives under `src/property-registry/`.

## Core distinctions

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **LandParcel** | Physical/legal parcel unit and cadastral anchor | Title or ownership |
| **PropertyRecord** | Administrative property record for registry operations | Platform identity or payment |
| **TitleRecord** | Government-recognized title/ownership registry state | Application answers or fee payment |
| **PropertyInterest** | Recorded interest (ownership or other rights per jurisdiction) | Verified ownership by document possession alone |
| **PropertyTransfer** | Case-linked transfer intake / workflow material | Completed title mutation |
| **PropertyRegistryEntry** | Authoritative registry mutation after authority and decision | Client-direct holder update |

Possession of a document or certificate **does not** equate to legally verified ownership.

## Official title and registry path

```text
GovernmentService → Application → Case → Evidence → Verification → Authority → Decision
  → Registry Mutation (PropertyRegistryEntry / TitleVersion) → Official Instrument / Certificate
```

Clients **cannot** directly change title holders, encumbrance status, or official registry entries.

Transfer **applications** and **fee payments** are recorded separately and do not mutate title until a governed registry mutation is performed.

## Schema concepts

### Parcel & cadastre (no embedded GIS)

- `LandParcel`, `ParcelIdentifier`, `ParcelAddress`
- `ParcelGeometryReference` — external integration fields (`geometryReference`, `mapLayerReference`, `surveyReference`, `coordinateSystem`, `authoritativeSource`, `externalParcelReference`) for future PostGIS/GIS systems without embedding geometry in the domain core

### Administrative property & title

- `PropertyRecord`, `TitleRecord`, `TitleVersion`, `TitleInstrumentReference`
- `PropertyInterest`, `PropertyInterestHolder`, `PropertyInterestHistory`
- Immutable/versioned title history; transfers supersede prior versions without deleting them

### Transfers & parties

- `PropertyTransfer`, `TransferParty`, `PropertyTransferEvidenceLink`
- Optional links to `Application`, `Case`, `GovernmentService`, `PaymentTransaction` (fee only)

### Encumbrances (configurable types, no generic legal inference)

- `PropertyEncumbrance` with typed extensions: `MortgageReference`, `LienReference`, `EasementReference`, `RestrictionReference`
- Release/supersession only — silent deletion is blocked

### Surveys & valuation

- `SurveyRecord`, `SurveyPlanReference`, `SurveyorCertificationReference`
- `PropertyValuationRecord` (taxation, acquisition, market reference, other) — valuation is **not** title
- `PropertyTaxReference` links to revenue `TaxpayerAccount` without duplicating tax domain models

### Governance, protection, and history

- `PropertyRegistryEntry`, `PropertyRegistryCorrection`, `PropertyRegistryVerification`, `PropertyRegistryRestriction`
- `PropertyTransactionHistory`, `PropertyRegistryAuditEvent`

## Access classifications

Configurable per record or restriction overlay:

| Classification | Typical use |
| -------------- | ----------- |
| `PUBLIC_REGISTRY` | Limited public registry / verification fields |
| `SUBJECT_ACCESS` | Registered subject or linked identity |
| `AUTHORIZED_PROFESSIONAL` | Licensed professionals per institutional policy |
| `GOVERNMENT_RESTRICTED` | Officials with institutional authorization |
| `SEALED` | Maximum protection; unauthorized reads appear as not found |

## Integration boundaries

References (does not duplicate): **Person**, **Organization**, **Identity**, **Application**, **Case**, **EvidenceRecord**, **GovernmentDecision**, **AuthorityEvaluationRecord**, **OfficialInstrument**, **PaymentTransaction**, **TaxpayerAccount**, **GovernmentService**, **ServicePackVersion**, **Jurisdiction**, **Institution**.

## Must-fail invariants (tests)

The module enforces at minimum:

- Citizens cannot directly change title holders
- Transfer applications do not themselves change ownership
- Transfer fee payment does not change title
- Prior title versions and interest history are preserved
- Parcel and title remain distinct concepts
- Encumbrances cannot be silently deleted
- Restricted property information is not exposed to unauthorized actors
- Unauthorized representatives cannot transfer property
- Technical/platform admins cannot mutate legal ownership
- AI cannot approve title transfer
- Title correction preserves previous state
- Public verification exposes only permitted registry metadata
