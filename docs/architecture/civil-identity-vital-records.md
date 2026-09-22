# Civil Identity & Vital Records

## Objective

Provide a jurisdiction-neutral civil registration and vital-records architecture for services such as birth, death, marriage, divorce, legal name change, civil-status correction, adoption-related updates (where authorized), civil identity references, certified extracts, amendments, and corrections — without encoding any particular national statute. Operational rules, eligibility, and public-access policy are supplied through **Government Service Packs** and **authenticated governing sources**.

## Canonical module

All civil registry domain logic lives under `src/civil-registry/`.

## Distinction from platform identity (Phase 3)

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **Person / Identity** | Platform authentication and representation | Legal civil status or vital fact |
| **CivilPersonRecord** | Government civil-record subject in registry context | Login account or permission |
| **CivilRegistryEntry** | Authoritative official civil fact after governed registration | Application answer or citizen self-declaration |
| **VitalEvent (intake)** | Case-linked event material pending official registration | Registered vital record |
| **Correction request** | Citizen-initiated request for review | Approved correction or amendment |

`CivilPersonRecord.personId` may **link** to a platform `Person` for subject access and communications, but civil facts remain independently governed and versioned.

## Official registration path

Citizen or official **application** may initiate intake only:

```text
Application → Case → Evidence → Review → Authority → Decision → CivilRegistryEntry → Certificate/Extract
```

Self-declaration, draft form answers, or API clients **cannot** set `REGISTERED_OFFICIAL` status or create `CivilRegistryEntry` rows directly.

## Core models

### Subject & identity references

- `CivilPersonRecord` — civil-domain person container (optional `personId` link)
- `CivilIdentityRecord` — configurable national/civil identity reference types and values

### Vital events

- `VitalEvent` — generic event with jurisdiction, institution, dates, case/application links, service pack provenance, verification state, and access classification
- `BirthEvent`, `DeathEvent`, `MarriageEvent`, `DivorceEvent` — typed extensions (1:1 with `VitalEvent`)
- `CivilRecordRelationship` — related persons / roles on an event
- `VitalEventEvidenceLink` — supporting evidence from Phase 7

### Official registry

- `CivilRegistryEntry` — authoritative fact; requires `caseId`, `governmentDecisionId`, and `authorityEvaluationRecordId`
- `CivilRegistryVersion` — immutable version snapshots; current version flagged with `isCurrent`
- `CivilRecordAmendment` — non-destructive change record with previous/new values and authority anchors
- `CivilRecordCorrectionRequest` — citizen request distinct from approval/amendment

### Governance, protection, and issuance

- `CivilRegistrySourceReference` — provenance and governing source pointers (optional `DocumentRecord`)
- `CivilRegistryVerification` — verification state transitions
- `CivilRegistryRestriction` — policy-driven access elevation (e.g. sealed)
- `CivilRegistryAuditEvent` — append-only audit trail
- `CivilRegistryCertificateExtract` — certified extract pinned to `CivilRegistryVersion` (optional Phase 8 instrument/issuance links)

## Access classifications

Configurable per record or restriction overlay:

| Classification | Typical use |
| -------------- | ----------- |
| `PUBLIC_VERIFICATION_ONLY` | Limited verification fields only |
| `SUBJECT_ACCESS` | Registered subject (via linked identity/person) |
| `AUTHORIZED_GOVERNMENT` | Institutionally authorized officials |
| `RESTRICTED` | Heightened protection; not exposed to general actors |
| `SEALED` | Maximum protection; unauthorized reads appear as not found |

Policy defaults are **not** hard-coded per event type; service packs and institutional policy drive exposure.

## Amendments and corrections

- **Never** delete historical `CivilRegistryVersion` rows or overwrite prior snapshots.
- Amendments create a new version, mark the prior version superseded, and store `CivilRecordAmendment` with basis, authority, and field-level deltas.
- Correction **requests** may be submitted by applicants; **approval** routes through review, authority, decision, and amendment — not direct client status changes.

## Integration map

| Partner domain | Integration |
| -------------- | ----------- |
| Identity & Access | Optional `Person` link; subject access checks |
| Government structure | `Jurisdiction`, `Institution`, registrar `Officeholder` |
| Authority | Required `AuthorityEvaluationRecord` for registration and amendments |
| Service catalog & packs | `GovernmentService`, `ServicePackVersion` governing configuration |
| Applications & cases | Intake via `Application` / `Case` |
| Evidence & records | `EvidenceRecord`, `DocumentRecord` references |
| Decisions & issuance | `GovernmentDecision`, `OfficialInstrument`, `IssuanceEvent` for extracts |
| Redress & communications | Future workflows attach via case and communication channels (not conflated with registry facts) |

## Boundary services

- `CivilRegistryBoundaryService` — client-forged status rejection, platform-admin prohibition, AI prohibition, deletion block, certificate pinning
- `CivilRegistryAccessService` — classification resolution and cross-citizen denial
- `CivilRegistryRegistrationService` — official entry recording after authority permit
- `VitalEventIntakeService` — non-official intake creation
- `CivilRecordAmendmentService` — versioned amendments
- `CivilRecordCorrectionService` — request vs approval separation
- `CivilRegistryCertificateService` — extract issuance pinned to registry version

## API surface (foundation)

Authenticated routes under `/civil-registry`:

- `POST /vital-events/intake` — start intake (draft only)
- `POST /correction-requests` — submit correction request
- `GET /entries/:entryId` — governed read with access masking

Consequential registration, amendment, and certificate operations are exposed through services for official workflows and consequential-action guards in later experience layers.
