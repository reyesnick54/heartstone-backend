# Social Protection & Public Benefits Service Pack

HeartStone provides social protection and public benefits administration through a governed **service pack** plus the canonical **`src/social-protection`** domain (foundation on `main` from the public benefits schema). This pack layers **NON_PRODUCTION** template services and **citizen/caseworker experience APIs** on that foundation. Citizens and officials use **experience APIs**; consequential award, suspension, termination, disbursement, and appeal decisions remain authority-governed. All template rules stay **`NON_PRODUCTION`**.

## Separation of concerns

| Concern | Meaning |
|---|---|
| **Application profile** | Records intake only (`doesNotCreateAward`); does not issue an award |
| **Program match recommendation** | Preliminary matching only (`isAuthoritativeEligibility` default false) |
| **Award record** | Official benefit award lifecycle with append-only status history |
| **Authorized disbursement** | Separate authorization record before any payment |
| **Payment transaction** | Linked via `BenefitDisbursementPaymentLink`; failure does not auto-terminate award |
| **Change of circumstances** | Citizen-reported information (`isVerifiedGovernmentFact` false at filing) |
| **Appeal** | Preserves original government decision reference |

Applications, preliminary matches, payments, and reported changes **must not** collapse into a single award or eligibility status in experience projections.

## Service pack

- Manifest id: `template-social-protection-public-benefits`
- On-disk template: `service-packs/templates/13-social-protection-public-benefits.pack.json`
- Authoring source: `src/service-catalog/service-packs/social-protection-service-pack.template.ts`
- **15 NON_PRODUCTION template services**: Income Support Application; Unemployment Support Application; Family Assistance Application; Housing Assistance Application; Disability Support Application; Elderly Support Application; Child / Family Support Application; Emergency Assistance Request; Disaster Relief Application; Government Subsidy Application; Benefit Renewal; Change of Circumstances; Benefit Payment Inquiry; Benefit Decision Review; Public Benefits Appeal
- Placeholder forms, evidence, workflows, and SLAs **without jurisdiction-specific eligibility thresholds**

Validation uses `validateServicePackManifest`.

## Domain module (`src/social-protection`)

- **Households**: `BenefitHouseholdProfile`, members, representative access scope JSON
- **Programs**: catalog entries with sensitivity category; generic search filters sensitive/restricted programs
- **Applications**: `BenefitApplicationProfile` linked to case/application
- **Awards**: `BenefitAwardRecord` with status history and authority-gated transitions
- **Disbursements**: `BenefitAuthorizedDisbursement` → `BenefitDisbursementPaymentLink` → `PaymentTransaction`
- **Changes, appeals, external determinations, access audit**

Boundary services enforce household access boundaries, representative scope, authority evaluation for consequential actions, AI exclusion, and payment/award separation.

## Experience APIs

### Citizen

- `GET /experience/citizen/benefits`
- `GET /experience/citizen/benefits/programs`
- `GET /experience/citizen/benefits/applications`
- `GET /experience/citizen/benefits/awards`
- `GET /experience/citizen/benefits/payments`
- `GET /experience/citizen/benefits/actions`

### Official benefits workspace

- `GET /experience/official/benefits/workspace`
- `GET /experience/official/benefits/awards/:id/available-actions`

Queues cover new applications, eligibility review, evidence deficiencies, external determination requests, award-ready cases, renewal reviews, change-of-circumstances reviews, suspension/termination reviews, payment issues, appeals, and SLA risk. Available consequential actions use the authority engine at execution time.

## Testing

- Service pack: `src/service-catalog/service-packs/social-protection-service-pack.template.spec.ts`
- Schema guard: `src/social-protection/social-protection-schema.spec.ts`
- Domain invariants: `src/social-protection/social-protection-invariants.spec.ts`
- Must-fail gates: `src/social-protection/social-protection.must-fail.spec.ts`
- Integration: `test/social-protection-service-pack.integration-spec.ts`

Mandatory invariants include pack validation, NON_PRODUCTION labeling, household access boundaries, application-not-award, preliminary matching, reported-change rules, authority-gated award actions, AI exclusion, payment failure boundaries, appeal preservation, representative scope, and sensitive program filtering.
