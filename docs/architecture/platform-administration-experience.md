# Platform Administration Experience API

HeartStone's Platform Administration Experience API provides a **governed administrative environment** for authorized platform administrators to configure and monitor the government platform. It is not a superuser bypass.

## Architectural invariants

| Concept | Meaning in this API |
|---------|---------------------|
| **User** | Authenticated identity (login session) |
| **Platform administrator** | Identity with an explicit `PlatformAdministrativeAccessPolicy` |
| **Officeholder / Appointment** | Institutional position facts; separate from platform administration |
| **Permission** | Technical configuration capability scoped by policy |
| **Authority** | Evaluated only through consequential-action endpoints; never implied by admin visibility |

**Platform administration does not confer decision authority.** All responses include `hasSubstantiveGovernmentAuthority: false`.

**Configuration visibility does not grant substantive government access.** Administrative projections are read-only summaries for frontend navigation.

**Administrative action discovery is metadata only.** Available actions describe governed configuration routes; they do not execute consequential mutations.

## Module location

```
src/experience/
  experience.module.ts
  platform-admin/
    platform-admin.module.ts
    platform-admin.controller.ts
    guards/platform-admin-experience.guard.ts
    policy/
      platform-administrative-access-policy.service.ts
      platform-admin-boundary.service.ts
    services/
```

Registered in `ExperienceModule`.

## Authorization

All endpoints require `SessionAuthGuard` (Bearer token) and `PlatformAdminExperienceGuard`.

Access is granted only when a matching `PlatformAdministrativeAccessPolicy` exists:

- `permissionCode = PLATFORM_ADMINISTRATIVE_ACCESS`
- Policy is effective for the current time window
- `substantiveAccessDenied = true` (required invariant)
- Identity account is not suspended

Service / AI identities are denied.

| Actor | Result |
|-------|--------|
| Citizen without policy | `403 Forbidden` |
| Government official without policy | `403 Forbidden` |
| Platform admin with policy | Access granted |
| Official with explicit admin policy | Access granted |

Every access attempt is recorded in `PlatformAdministrativeAccessAudit` and `SecurityAuditEvent`.

## Endpoints

Base path: `/api/v1/experience/platform-admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/home` | Configuration and operations summary |
| GET | `/institutions` | Institution administrative projection |
| GET | `/departments` | Department administrative projection |
| GET | `/offices` | Office administrative projection |
| GET | `/officeholders` | Officeholder administrative projection |
| GET | `/services` | Government service configuration projection |
| GET | `/forms` | Form definition projection |
| GET | `/workflows` | Workflow definition projection |
| GET | `/integrations` | Integration definition projection |
| GET | `/communications` | Communication template projection |
| GET | `/ai-agents` | AI service identity projection |
| GET | `/security` | Security signal projection |
| GET | `/readiness` | Production readiness projection |
| GET | `/available-actions` | Governed configuration action discovery |

## Home summary

`GET /home` aggregates non-authoritative operational counts including:

- Institutions and departments configured
- Government services by maturity status
- Unpublished service versions
- Suspended services
- Forms requiring activation
- Workflows requiring validation
- Integrations degraded/offline
- Suspended AI agents
- Security/readiness issues
- System dependencies
- Production readiness blockers

Counts are advisory configuration signals; they do not establish legal or operational authority.

## Admin safety boundaries

`PlatformAdminBoundaryService` enforces that platform administrators cannot:

- Approve or decide cases
- Create institutional authority through configuration alone
- Activate suspended services via generic PATCH (`maturityStatus`)
- Alter finalized government decisions through administration
- Bypass active legal holds
- Activate AI agents outside approved lifecycle governance

Domain activation, authority, acceptance, issuance, record immutability, and legal hold protections remain enforced in their canonical domain services.

## Data model

```
PlatformAdministrativeAccessPolicy
PlatformAdministrativeAccessAudit
```

Policies are separate from government authority records, appointments, and function authority lifecycle.

## Testing

Mandatory negative tests live in:

- `test/platform-admin-experience.e2e-spec.ts`
- `src/experience/platform-admin/policy/platform-admin-boundary.service.spec.ts`

Coverage includes citizen denial, official denial without policy, audit generation, substantive access separation, and domain bypass prevention.
