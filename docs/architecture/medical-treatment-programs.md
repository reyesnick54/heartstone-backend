# Medical Treatment Programs

This document describes how HeartStone's healthcare foundation supports **treatment programs** without conflating care delivery with authorization.

## Foundations already in place

Treatment programs consume:

- **Patient references** (`HealthcarePatientReference`) tied to platform identity
- **Purpose-bound consent** for treatment and data sharing (`HealthcareConsent`, `HealthcareConsentGrant`)
- **Health data registry references** for clinical artifacts (`HealthDataRecordReference`)
- **Clinical safety architecture** for adverse events, protocol deviations, and corrective/preventive actions
- **Regulatory references** for licensed facilities/professionals and compliance matters

## Explicit non-goals in this phase

- Full EHR/clinical workflow orchestration
- Automated treatment decisions or AI-established clinical causality
- Claiming interoperability standards compliance from adapter metadata alone

## Program alignment pattern

Future treatment program modules should:

1. Reference patients via `HealthcarePatientReference`, never raw client identity assertions
2. Declare treatment purpose codes registered in `HealthcareConsentPurposeDefinition`
3. Attach program metadata to regulated entity references where licensing/oversight applies
4. Route safety signals through `ClinicalSafetyService` boundaries

See `healthcare-consent-data-safety-interoperability.md` for consent, safety, and integration invariants.
