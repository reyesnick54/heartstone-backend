# Healthcare Registry & Health Identity

## Objective

Provide a jurisdiction-neutral architecture for government healthcare administration: provider and facility registry, regulated professional records, patient health identity linkage, privacy policy enforcement, and audited emergency access. Legal privacy rules and clinical program policy are supplied through **Government Service Packs**, **HealthcareJurisdictionPrivacyHook** configuration, and **authenticated governing sources** — not hard-coded national medical privacy law.

## Canonical module

All healthcare domain logic lives under `src/healthcare/`. Infrastructure readiness probes remain under `src/health/` and are not part of this domain.

Sub-areas:

| Path | Responsibility |
| ---- | -------------- |
| `registry/` | Organizations, facilities, registry entries, verification |
| `patient/` | Patient health identity boundaries |
| `professional/` | Professional records and licensing representation |
| `privacy/` | Access policy, break-glass, search filtering, access audit |
| `common/` | Cross-cutting boundaries and references |

## Core identity distinctions

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **Person / Identity** | HeartStone platform identity (login, sessions) | Patient health identity or licensure |
| **PatientHealthIdentity** | Healthcare-domain identity linkage and registry anchor | Substitutable client field |
| **HealthcareProfessional** | Regulated professional record | Automatic result of login |
| **HealthcareProfessionalLicense** | Authoritative license state after workflow | Professional registration or org membership |
| **HealthcareOrganization** | Regulated provider organization record | Licensed provider because of an Organization account |
| **HealthcareFacilityLicense** | Facility authorization after workflow | Facility registration |

A login does not make someone a healthcare professional. A professional record does not create a license. Provider organization membership alone does not grant patient chart access.

## Official licensing and registry path

```text
GovernmentService → Application → Case → Evidence → Authority → Decision
  → Issuance (optional) → Registry Mutation (HealthcareRegistryEntry / license record)
```

Clients cannot set license status, patient identity linkage, or official registry entry fields directly.

## Registry concepts

- **HealthcareOrganization**, **HealthcareFacility**, **HealthcareFacilityType**, **HealthcareServiceLocation**
- **HealthcareProfessional**, **HealthcareProfessionalType**, **HealthcareProfessionalLicense**, **HealthcareProfessionalSpecialty**, **HealthcareProfessionalCredentialReference**, **HealthcareProfessionalStatusHistory**
- **HealthcareAccreditation**, **HealthcareFacilityLicense**, **HealthcareRegulatoryStatus**
- **PatientHealthIdentity**, **PatientHealthcareRelationship**, **HealthcareIdentifierReference**
- **HealthcareRegistryEntry**, **HealthcareRegistryVerification**, **HealthcareRegistryStatusHistory**

## Privacy and access policy

**HealthcareDataAccessPolicy** evaluates access using:

- actor and patient
- relationship (self, guardian, treating provider, care team, research, regulatory)
- purpose
- data category (technical classification)
- consent and legal/regulatory basis reference (opaque hook)
- institution scope
- professional license status and validity window
- emergency break-glass session state

Policies may reference **HealthcareJurisdictionPrivacyHook** rows that point to external jurisdiction policy packs without embedding statute in code.

### Health data categories (technical)

`GENERAL_HEALTH`, `CLINICAL`, `MEDICATION`, `LABORATORY`, `IMAGING`, `GENETIC`, `REPRODUCTIVE`, `MENTAL_HEALTH`, `SUBSTANCE_USE`, `RESEARCH`, `HIGHLY_RESTRICTED`

These are technical classifications, not legal conclusions.

## Break-glass (emergency access)

**HealthcareBreakGlassAccessSession** records:

- explicit reason (required)
- actor and patient/resource scope
- policy basis reference
- expiration
- enhanced audit events
- post-access review flag

Break-glass is time-bound and audited; it is **not** unlimited platform administrator access.

## Audit

**HealthcareAccessAuditEvent** supports recording sensitive reads, search operations, policy denials, and break-glass activation/use.

## Service integration

Professional and facility licensing models link to **Application**, **Case**, **GovernmentService**, **AuthorityEvaluationRecord**, **GovernmentDecision**, and **IssuanceEvent** so licensing remains a government service workflow.

## Must-fail gates (tests)

The `healthcare.must-fail.spec.ts` suite encodes minimum safety gates including cross-patient denial, platform admin clinical boundary, org membership insufficiency, license expiry, patient identity substitution, break-glass reason/audit/expiry, classification-aware search, self-licensing denial, and AI professional boundary.
