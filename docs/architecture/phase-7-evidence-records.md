# Phase 7 — Master Administrative File, Evidence Governance & Records Management

## Objective

Establish the authoritative administrative record for each case: documents, evidence, verification, purpose acceptance, controlled decision-support packets, corrections, retention, legal holds, and disposition — stopping at `DECISION_PENDING` without making government decisions or issuing instruments.

## Conceptual separation

| Concept | Meaning | Does NOT mean |
|---|---|---|
| **Document** | Stored record artifact with versioned content and integrity hash | Authentic, true, or approved |
| **Evidence** | Material offered or used to establish a fact or satisfy a requirement | Government decision |
| **Verification** | Defined property checked by a defined reviewer using a defined method | Upload, hash match, or acceptance |
| **Acceptance** | Evidence accepted for a specific stated administrative purpose | Universal truth or eligibility approval |
| **Evidence Packet** | Immutable, controlled decision-support collection with pinned manifest | Decision or instrument issuance |
| **Master Administrative File** | Authoritative, reconstructable administrative record for a case | Case approval or permit issuance |
| **Legal Hold** | Suspension of disposition for identified targets | Case closure or approval |
| **Retention Schedule** | Institutionally approved lifecycle rule | Vendor default or automatic deletion |
| **Hash** | Integrity evidence that content has not changed | Substantive truth of content |
| **Correction** | Preserve original + create attributable amendment | Overwrite or backdated change |
| **Decision** | Phase 8 | — |
| **Issuance** | Phase 8/later | — |

## Canonical module

All Phase 7 logic lives under `src/evidence-records/`.

## Core models

### Master Administrative File

- `MasterAdministrativeFile` — institutional owner required; links to `Case`
- `MasterAdministrativeFileSection` — structured sections (intake, evidence, review, etc.)

### Documents & storage

- `DocumentRecord` — registered document with classification
- `DocumentVersion` — immutable version with `contentHash` and `storageReference`
- `DocumentAssociation` — links documents to cases, requirements, packets

### Evidence lifecycle

- `EvidenceRecord` — status: `RECEIVED` → `VERIFIED` → `ACCEPTED` (also `DISPUTED`, `WITHDRAWN`, `SUPERSEDED`, `EXPIRED`, `QUARANTINED`)
- `EvidenceVerification` — official verification of defined properties
- `EvidenceRequirementLink` — crosswalk to Phase 5 service/checklist requirements
- `EvidencePurposeAcceptance` — purpose-specific acceptance (not universal)
- `EvidenceQualityAssessment` — quality signal; cannot conceal mandatory missing evidence

### Review & communication records

- `DepartmentalReviewRecord`
- `GovernmentCommunicationRecord` — acknowledgment ≠ approval; concurrence requires explicit record
- `ProfessionalReviewRecord` — qualification, scope, methodology, signature, limitations
- `InspectionRecord` / `InspectionEvidenceItem` — observations ≠ enforcement decisions

### Chain of custody & packets

- `EvidenceCustodyEvent` — append-only custody history
- `EvidencePacket` / `EvidencePacketVersion` / `EvidencePacketItem` / `EvidencePacketManifest` — frozen decision-support snapshot with pinned versions

### Corrections, audit & replay

- `RecordCorrection` — what, who, why, authority, supporting evidence, affected records
- `RecordIntegrityEvent` — hash verification events
- `RecordAccessEvent` — access audit trail (append-only)

### Retention & disposition

- `RetentionSchedule` / `RetentionRule` / `RecordRetentionAssignment`
- `LegalHold` / `LegalHoldTarget` — blocks disposition until authorized release
- `PreservationCollection` / `ArchivalTransfer`
- `RecordDispositionRequest` / `RecordDispositionRecord`

## Master File completeness

`MasterFileCompletenessService` evaluates whether required sections and evidence exist.

| Outcome | Meaning |
|---|---|
| `COMPLETE` | Required evidence present and accepted for stated purposes |
| `INCOMPLETE` | Missing or disputed evidence |
| `UNRESOLVED` | Verification or acceptance pending |
| `SAFE_HALTED` | Integrity failure or safe-halt condition |

Completeness does **not** mean: case approved, evidence true, decision valid, or instrument issued.

## Phase integrations

### Phase 3 — Identity

- Applicant and official endpoints use `SessionAuthGuard`
- Restricted records enforce identity-scoped access
- Internal/privileged records blocked from public API

### Phase 4 — Authority

- Consequential operations (corrections, legal hold release, disposition) call `AuthorityEvaluationService`
- Technical roles and vendor identities cannot be records owners
- AI cannot finalize authenticity determinations or sign professional reports

### Phase 5 — Service catalog

- `EvidenceRequirementLink` references exact service/checklist/requirement configuration
- Acceptance for one purpose does not satisfy unrelated requirements

### Phase 6 — Applications & cases

- `Case` carries stable reference fields: `masterAdministrativeFileReference`, `documentRegisterReference`, `evidencePacketReference`, `recordsClassificationReference`, `retentionLegalHoldReference`
- Case may reach `DECISION_PENDING`; Phase 7 does not create `GovernmentDecision`

## Target flow

```
ApplicationSubmission → Case → MasterAdministrativeFile
  → Document receipt → DocumentVersion + checksum
  → EvidenceRecord (RECEIVED)
  → EvidenceVerification → purpose acceptance
  → Departmental / Government / Professional / Inspection records
  → EvidencePacket (frozen manifest)
  → Case DECISION_PENDING
```

## Explicit exclusions (Phase 7 boundary)

Phase 7 does **not** create:

- `GovernmentDecision`
- `IssuedLicense` / `IssuedPermit` / `IssuedCertificate`
- Final approval or refusal outcomes

## Security controls

- IDOR protection on all record endpoints
- No mass assignment of verification/acceptance status
- Object-store authorization; no permanent unauthenticated URLs
- Malware quarantine blocks normal download
- Append-only audit and integrity events
- Frozen packets cannot be mutated
- Legal hold blocks disposition; ordinary administrators cannot self-release

## Acceptance tests

| Suite | Path | Coverage |
|---|---|---|
| Schema coherence | `src/evidence-records/evidence-records-schema.spec.ts` | Model boundary |
| Completeness | `src/evidence-records/completeness/master-file-completeness.service.spec.ts` | Outcome evaluation |
| Must-fail invariants | `src/evidence-records/evidence-records-phase-7.must-fail.spec.ts` | 50 architectural gates |
| Integration | `test/phase-7-evidence-records.integration-spec.ts` | Service flows |
| E2E happy path | `test/phase-7-evidence-records.e2e-spec.ts` | Full flow to DECISION_PENDING |
| E2E must-fail | `test/phase-7-evidence-records.must-fail.e2e-spec.ts` | Security boundaries |
