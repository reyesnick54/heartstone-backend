# S21a — Restricted administrative routes are deny-by-default

## Problem

`RouteClass.RESTRICTED_ADMINISTRATIVE` only stopped machine identities. `PermissionsGuard`
let any route without `@RequirePermissions` through, so any signed-in person, including a
citizen, could:

- mark a governing source as authenticated and name someone else as the authenticator;
- record external determinations and institutional acts;
- release legal holds (permissions were read from the request body);
- create departments, offices and officeholders, edit services and forms, accept service
  packs, accept integrations, and approve consequential use of intelligence.

192 routes declared as restricted carried no permission.

## Change

1. **Guard.** `PermissionsGuard` treats any route whose declared class (handler `@RouteAccess`,
   else controller `@ControllerRouteAccess`) is `RESTRICTED_ADMINISTRATIVE` as deny-by-default.
   Without an explicit permission the request is refused and audited as
   `DENIED_ADMINISTRATIVE_DEFAULT`.
2. **Permissions.** Every restricted route now declares one permission. New codes are listed in
   `permission-codes.constants.ts` and placed in access levels:
   - **C** reads of structure, governing sources, the service catalogue, retention schedules,
     service packs;
   - **D** casework: authority evaluation, master files, redress, communications, financial
     reads, integration exchanges, intelligence analysis, AI assistance, readiness reads;
   - **E** configuration: government structure, services and forms (including publishing),
     records schedules, legal-hold placement, integrations, readiness, service-pack authoring;
   - **F** assurance: authenticating or revoking governing sources, recording external
     determinations and institutional acts, redress external determinations, integration
     acceptance, consequential use of intelligence, readiness maturity decisions, service-pack
     acceptance, legal-hold release.
3. **Roles.** New bootstrap roles: `authority-assurance-officer`, `service-catalog-administrator`,
   `institutional-case-officer` (level D), `intelligence-analyst`, `integration-administrator`,
   `payment-provider-callback` (machine only).
4. **Actor binding.** Governing-source authentication and revocation, legal-hold placement and
   release, and disposition requests take the acting officer from the session. The request
   cannot name anyone. Authentication, revocation, external determinations and institutional
   acts are written to the tamper-evident audit ledger with the session actor.
5. **Segregation of duties.** The officer who placed a legal hold cannot release it. Release
   permission is resolved from role assignments on the server.
6. **Records governance controller** (`/evidence-records/*`) is now restricted; legal-hold
   bodies are validated DTOs.
7. **Self-service auth routes** (`logout`, `logout-all`, `me/step-up-protected`) are classified
   `AUTHENTICATED_SELF_SERVICE` on the handler so they are not caught by the controller class.
8. **Scanner.** The route manifest records `declaredRouteClass` (what the guards read) next to
   the heuristic `routeClass`, recognises `@RequirePermissions(code, { scope })`, and a unit test
   fails if any declared restricted route lacks a permission. Two codes were renamed to the
   three-part convention: `configuration:change:activate`, `audit:ledger:read`.

## Not in this slice

- `AUTHENTICATED_INSTITUTIONAL` and `CONSEQUENTIAL_AUTHORITY_CONTROLLED` routes without
  permissions (S21b).
- Services that evaluate authority for an identity named in the request body (S21c).
- DTO validation for routes typed as `Parameters<…>` (S21d).
- The payment webhook still requires a session; it becomes a public, signature-verified route
  with the real payment provider.

Technical permission never creates legal authority: consequential actions still pass the
authority engine.
