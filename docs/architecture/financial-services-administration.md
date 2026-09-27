# Financial Services Administration (S18A)

Bounded HeartStone service family for ABSEZ financial-services regulatory administration. This domain does **not** duplicate generic licensing, compliance, or corporate registry platforms—it links to canonical organizations, application processing, evidence, decisions/issuance, compliance, and external authority dependencies.

## Service pack

| Concern | Canonical reuse |
| --- | --- |
| Intake, forms, workflow | Application processing + service pack workflow stages |
| Evidence & due diligence | Evidence records / packets |
| Decisions & instruments | Government decisions + official instruments |
| Compliance & inspections | `ComplianceMatter`, `InspectionRecord` via reference links |
| External / national regulator | `FinancialExternalRegulatoryDependency`, `RetainedNationalDetermination` references |
| Beneficial ownership | `FinancialBeneficialOwnershipLinkage` → corporate registry declaration (reference only) |

Template pack: `FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE` (`template-financial-services`).

## Delegated ABSEZ authority

`FinancialRegulatedEntityProfile.delegatedLicenceFunctionActivation` defaults to `INACTIVE`. Without a governing delegation instrument configured in authority policy, delegated licence issuance endpoints must not produce final ABSEZ licences.

## Retained national boundary

Services flagged `requiresNationalDetermination` block ABSEZ issuance until external dependencies reach `RESOLVED`. HeartStone records coordination state (`AWAITING_EXTERNAL_DETERMINATION`) but does not manufacture national approvals.

## Confidentiality

Regulatory profiles use `PROTECTED_REGULATORY` classification and `FinancialRegulatoryAccessAudit`. Applicant/citizen actors are denied regulatory file reads via `FinancialServicesAccessService`.

## Reporting

`FinancialServicesOperationalSnapshot` stores computed counts (entities, open applications, issued licences, awaiting external, suspended) for later KPI frameworks—no manually typed aggregate performance numbers.

## Module layout

- `src/financial-services/` — domain services, controllers, experience projections
- Prisma foundation — `financial_*` tables in migration `20260927120000_financial_services_administration_foundation`
