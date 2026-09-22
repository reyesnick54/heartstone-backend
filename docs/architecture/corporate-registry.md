# Corporate Registry & Business Formation (domain)

## Canonical implementation

Production corporate registry behavior on `main` is implemented through:

- **Domain module:** `src/corporate-registry/` (`CorporateRegistryProfile`, lifecycle, certificates, public verification)
- **Service pack templates:** `docs/architecture/corporate-registry-service-pack.md`
- **Business experience APIs:** organization-scoped corporate profile, filings, officers, certificates, and actions

This document captures cross-cutting domain rules that apply regardless of jurisdiction configuration.

## Organization vs registry fact

| Concept | Role |
| --- | --- |
| **Organization** | HeartStone identity and business-account representation |
| **CorporateRegistryProfile** | Official registry state linked to an organization (not self-declarable) |

Membership or representative authority enables **business representation** for filings and dashboards; it does not confer director status or registry approval.

## Governed lifecycle

- Registration status changes only through official registry decisions (`CorporateRegistryLifecycleService`).
- Filing intake and payment events do **not** activate legal entity registration.
- Certificates require an approved registry record and issuable registration status.
- Beneficial ownership is excluded from public verification responses.

## Institutional scope

`ScopedResourceType.CORPORATE_REGISTRY_PROFILE` resolves ownership through the linked `organizationId` for scope evaluation on profile-scoped operations.

## History and amendments

Registered office updates supersede prior rows while retaining history. Restoration preserves dissolution history events. Client actors cannot forge registration or approval statuses.

## Related architecture

- Phase 6 case/application workflow for intake and examination
- Phase 8 decisions and Phase 8e instruments for authoritative outcomes and certificates
- Phase 11 payments (fees recorded with `activatesEntity: false`)
