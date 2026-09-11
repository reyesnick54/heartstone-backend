# Phase 3 — Identity & Access

## Objective

Establish who an actor is, how they authenticate, and what technical access they have — without evaluating or conferring governmental decision authority.

Phase 3 is identity and access. It does not implement the Authority Engine.

## Core concepts (kept separate)

| Concept | Role in Phase 3 |
|---|---|
| **Person** | Natural person record (name, identifiers). Not a login account. |
| **UserAccount** | System login account with status lifecycle. Not an Officeholder. |
| **Identity** | Abstract actor identity (individual, organization, or service). Proves *who* the actor is. |
| **Credential** | Stored authentication secret (hashed password, OIDC subject, API key hash). Never plaintext. |
| **AuthenticationMethod** | Configured method boundary (password, OIDC, MFA, service API key). |
| **Session** | Active authenticated session with opaque token (hashed at rest). |
| **Organization** | Non-government organizational entity for membership/representation. |
| **OrganizationMembership** | Identity membership in an organization. Not a government role. |
| **RepresentativeAuthority** | Organizational representation scope. **Not** government decision authority. |
| **IdentityOfficeholderLink** | Controlled association between an Identity and an institutional Officeholder record. Does not confer authority. |
| **SecurityAuditEvent** | Immutable security/audit event log for identity lifecycle actions. |

## Government concepts (Phase 2 — unchanged)

Officeholder, Appointment, Delegation, Institution, and Jurisdiction remain in `src/government`. Phase 3 links to them only through `IdentityOfficeholderLink` and does not modify their semantics.

## Invariants

1. **User ≠ Officeholder ≠ Role ≠ Permission ≠ Authority**
2. Identity proves who the actor is.
3. Authentication proves possession/control of an authentication method.
4. Technical access allows use of software functions (e.g. `/identity/me`).
5. Officeholder association connects an identity to an institutional person/position record.
6. Appointment/Delegation remain separate institutional facts in the government domain.
7. **Government authority is not evaluated until Phase 4.** `AuthorityBoundaryService` always returns `null`.

## Authentication architecture

- Password credentials are hashed with scrypt before storage.
- Sessions use opaque random tokens; only SHA-256 hashes are stored.
- `SessionAuthGuard` validates: token exists, not revoked, not expired, account active.
- Bearer token in `Authorization` header for protected endpoints.
- Revoked sessions are rejected with audit events.

## OIDC / MFA / service identity boundaries

- **OIDC**: `AuthenticationMethod` records issuer/client/audience. External claims are logged but never auto-elevate privilege.
- **MFA**: `AssuranceLevel` on sessions and methods. Higher assurance does not confer government authority.
- **Service identity**: `IdentityType.SERVICE` for non-human actors. Authentication succeeds but grants no government authority.

## API surface (`/api/v1/identity/...`)

- `POST /identity/persons`
- `POST /identity/user-accounts`
- `POST /identity/identities`
- `POST /identity/credentials`
- `POST /identity/authentication-methods`
- `POST /identity/organizations`
- `POST /identity/memberships`
- `POST /identity/representative-authorities`
- `POST /identity/officeholder-links`
- `POST /identity/auth/login`
- `POST /identity/auth/logout`
- `GET /identity/me` (protected)

## Explicit exclusions (Phase 4+)

- Authority Engine evaluation
- Government decision authority resolution
- Function-level permission grants from identity alone
- Automatic privilege elevation from external OIDC claims
