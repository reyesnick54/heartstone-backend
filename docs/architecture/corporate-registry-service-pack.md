# Corporate Registry / Business Formation Service Pack

## Objective

Provide a jurisdiction-neutral, **NON_PRODUCTION** template service pack and corporate registry domain so companies and entrepreneurs can manage primary corporate lifecycle workflows through one HeartStone business account, while registry officers work official queues and the public can verify only policy-permitted facts.

## Service pack

Canonical manifest: `src/service-catalog/service-packs/corporate-registry-service-pack.ts`

Pack id: `corporate-registry-business-formation-pack`

Template services (all **NON_PRODUCTION**):

1. Reserve Business / Company Name
2. Incorporate Company
3. Register Sole Trader / Business
4. Register Foreign Company
5. Register Branch
6. Change Registered Office
7. Change Directors / Officers
8. Submit Beneficial Ownership Declaration
9. Annual Corporate Filing
10. Request Corporate Certificate
11. Company Dissolution
12. Company Restoration
13. Corporate Record Correction
14. Corporate Registry Search / Verification

Each service includes intake, completeness review, registry review, decision gate (where applicable), and issuance/verification stages with placeholder authority functions. Payment metadata exists in templates but **does not** activate legal entity status in the domain layer.

## Domain module

Location: `src/corporate-registry/`

Key invariants:

- Registration status changes only through `CorporateRegistryLifecycleService.applyOfficialDecision`.
- Payments are recorded with `activatesEntity: false`.
- Certificates require an **APPROVED** registry record via `CorporateCertificateService`.
- Registered office amendments supersede prior rows without deleting history.
- Restoration retains dissolution history events.
- Beneficial ownership declarations are never returned by public verification.

## Business Experience API

Base path: `/api/v1/experience/business/organizations/:organizationId`

| Endpoint | Purpose |
|---|---|
| `GET .../corporate-profile` | Corporate profile dashboard (entitlement-aware) |
| `GET .../filings` | Filings list |
| `GET .../officers` | Officer disclosures permitted for caller |
| `GET .../corporate-certificates` | Corporate certificates |
| `GET .../corporate-actions` | Outstanding corporate actions |

Access is enforced with `BusinessAccessService` (membership or representative authority). Beneficial ownership summary is limited to full organization visibility (active membership).

## Public verification

`GET /api/v1/public/corporate-registry/verify/:reference`

Returns only:

- registered name
- registration reference
- status
- jurisdiction
- verification timestamp

Controlled by `CorporateRegistryConfiguration.publicVerificationMode`. Disabled by default.

## Official registry workspace

`GET /api/v1/experience/official/corporate-registry/workspace`

Registry-officer queue summaries:

- name reservation
- incorporation
- amendment
- annual filing issues
- beneficial ownership review
- dissolution/restoration
- certificate issuance
- suspected inconsistencies
- SLA risks

Assignment and queue visibility do not imply legal authority to decide.

## Tests

- `src/service-catalog/service-packs/corporate-registry-service-pack.spec.ts`
- `src/corporate-registry/corporate-registry.invariants.spec.ts`
- `test/corporate-registry.integration-spec.ts`
