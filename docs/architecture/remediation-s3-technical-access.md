# Remediation S3 — Technical Roles, Permissions, and Deny-by-Default Access Control

## Objective

Introduce a canonical **technical authorization** layer that is separate from institutional/legal **authority** (Phase 4+ Authority Engine).

| Layer | Question answered |
|-------|-------------------|
| Authentication | Who are you? |
| Role / permission authorization | Which technical operations may your account access? |
| Authority | Do you possess legal/institutional authority for a consequential government action? |

These layers are not interchangeable.

## Module location

```
src/technical-access/
  technical-access.module.ts
  authorization/
    permissions.guard.ts
    require-permissions.decorator.ts
    deny-by-default-administrative.decorator.ts
  config/
    access-level-policy.config.ts
    technical-access-bootstrap.config.ts
  constants/permission-codes.constants.ts
  services/
```

Registered globally from `AppModule` after `SecurityModule`.

## Data model

| Model | Purpose |
|-------|---------|
| `TechnicalPermission` | Stable permission code (`domain:resource:action`) |
| `TechnicalRole` | Named bundle of permissions; optional `accessLevel` (A–F) |
| `TechnicalRolePermission` | Role ↔ permission join |
| `TechnicalRoleAssignment` | Identity ↔ role with institutional scope |
| `TechnicalAccessLevelPermission` | Access level A–F ↔ permission mapping (policy) |
| `TechnicalAccessAuditEvent` | Permission grant/deny audit trail |

### Scope model

Assignments use `TechnicalAccessScopeType`:

- `PLATFORM`
- `JURISDICTION`
- `INSTITUTION`
- `GOVERNMENT_BODY`
- `DEPARTMENT`
- `OFFICE`

Scoped assignments must match route scope (for example institution `:id` on `PATCH /institutions/:id`).

## Access levels A–F (Appendix I style)

Configured in `access-level-policy.config.ts` and synced to `TechnicalAccessLevelPermission` at startup. Levels map to explicit permission codes — they do **not** confer legal authority.

| Level | Typical use |
|-------|-------------|
| A | Public routes (`@Public()`) |
| B | Authenticated self-service (`identity:self:read`) |
| C | Institutional read |
| D | Institutional operations |
| E | Platform / identity / structure configuration |
| F | Restricted security and activation-class permissions |

## Deny by default

1. `@DenyByDefaultAdministrative()` on administrative controllers.
2. `@RequirePermissions(...)` on each handler with explicit permission codes.
3. Global `PermissionsGuard` (after `SessionAuthGuard`):
   - No metadata on an administrative route → **403**
   - Missing permission → **403**
   - Wrong scope → **403**
   - Actor is always the authenticated session (`session.identityId`) — never client-supplied `actingUserId`.

Routes without administrative metadata continue to require authentication only (existing behavior).

## Permission vs authority

- Technical permissions enable software functions (create user account, read institution list).
- `AuthorityBoundaryService` and `ConsequentialActionGuard` remain the path for government authority.
- Holding `authority:function-record:activate` permission does **not** activate authority records without authority evaluation.

## Bootstrap roles

System roles in `technical-access-bootstrap.config.ts` (no named individuals):

- `identity-platform-administrator`
- `government-structure-administrator`
- `institution-scoped-operator`

Catalog sync runs on module init via `TechnicalAccessCatalogService`.

## Audit

Permission checks record `TechnicalAccessAuditEvent` and `SecurityAuditEvent` (`TECHNICAL_PERMISSION_GRANTED` / `TECHNICAL_PERMISSION_DENIED`). Role assignment records `TECHNICAL_ROLE_ASSIGNED`.

## API

- `POST /api/v1/identity/technical-access/role-assignments`
- `GET /api/v1/identity/technical-access/identities/:identityId/role-assignments`

Both require explicit technical permissions and deny by default.
