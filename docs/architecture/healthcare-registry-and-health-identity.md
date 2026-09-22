# Healthcare Registry and Health Identity

## Health identity vs platform identity

`HealthcarePatientReference` links a governed patient reference token to a canonical platform `Identity`. This reference:

- Identifies the subject of healthcare records and consent grants
- Does **not** prove that any authenticated actor may access that subject's data

All authorization flows through `HealthcareDataAccessPolicyService` using server-derived `ActorContext`.

## Registry model

| Concept | Role |
| --- | --- |
| `HealthcarePatientReference` | Stable patient reference within healthcare domains |
| `HealthDataRecordReference` | Metadata pointer to external/clinical records |
| `HealthDataSource` | Originating system (EHR, lab, imaging, etc.) |
| `HealthDataCustodian` | Organization/institution custodianship |
| `HealthDataProvenance` | Verification and lineage summaries |
| `HealthDataAccessRecord` | Per-record access audit trail |
| `HealthDataCorrectionRequest` | Governed correction intake |

Records retain classification, retention metadata, consent/purpose constraints, and legal hold flags without copying full external clinical documents when references suffice.

## Guardian and representative context

`HealthcareGuardianConsentReference` associates guardian identity with ward patient references and optional consent linkage, preserving distinct legal bases from general patient consent.

## Related documentation

- `healthcare-consent-data-safety-interoperability.md` — consent, safety, interoperability boundaries
- `medical-treatment-programs.md` — treatment program alignment (future phase consumption)
