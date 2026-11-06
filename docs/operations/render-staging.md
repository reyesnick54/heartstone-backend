# Staging on Render

Staging runs from `render.yaml` as a Render Blueprint in the **Virginia** region, with
**synthetic data only**. It uses production security settings (`NODE_ENV=production`: OIDC sign-in
only, no password login, no public API docs) and `HEARTSTONE_DEPLOYMENT_TIER=staging`, which allows
sandbox providers for payments, email, SMS, signing, malware scanning and AI. Nothing issued in
staging is authoritative, and real personal data must never be entered.

## What runs

| Resource | Type | Size | Purpose |
| --- | --- | --- | --- |
| `heartstone-api-staging` | Web (Docker) | 1 CPU / 2 GB | API; runs migrations as the pre-deploy step |
| `heartstone-worker-staging` | Worker (Docker) | 1 CPU / 2 GB | SLA, escalation and renewal jobs (`node dist/worker.js`) |
| `heartstone-keycloak-staging` | Web (Docker) | 1 CPU / 2 GB | Identity provider, realm `heartstone`, client `heartstone-web` |
| `heartstone-redis-staging` | Key Value | 256 MB | Sessions cache and job queue; private network only |
| `heartstone-db-staging` | PostgreSQL 16 | 1 GB RAM, 10 GB | HeartStone data; private network only |
| `heartstone-keycloak-db-staging` | PostgreSQL 16 | 256 MB RAM, 5 GB | Keycloak data; private network only |

Deploys happen after GitHub CI passes on `main` (`autoDeployTrigger: checksPass`).

## Values set once at first deploy

Render generates all secrets (`generateValue`). Two plain values are entered after creation,
because they depend on URLs Render assigns:

| Service | Key | Value |
| --- | --- | --- |
| Keycloak | `HEARTSTONE_WEB_ORIGINS` | Space-separated https origins of the staging web apps |
| API and worker | `OIDC_PROVIDERS_JSON` | See below |

```json
[
  {
    "code": "heartstone-keycloak",
    "name": "HeartStone Keycloak (staging)",
    "issuer": "https://<keycloak-host>/realms/heartstone",
    "audience": "heartstone-api",
    "jwksUri": "https://<keycloak-host>/realms/heartstone/protocol/openid-connect/certs",
    "allowedAlgorithms": ["RS256"],
    "provisioning": { "citizenSelfService": true }
  }
]
```

`provisioning.citizenSelfService` lets people who register in Keycloak sign in on their first
visit. When a Keycloak subject has no HeartStone link yet, the backend creates a new person, user
account (login identifier `<provider code>:<subject>`) and individual identity, links the subject,
and records `IDENTITY_SELF_PROVISIONED` in the security audit log and the audit ledger. The new
identity gets the signed-in self-service baseline only: no technical roles, offices, organisation
memberships or authority to act for anyone else. Leave the setting out, or set it to `false`, to
require an administrator link for every subject.

Officials are not created this way. An administrator must still create or link the official's
identity, link it to an officeholder, and assign roles. An official who signs in before that has
happened gets a citizen identity with no access to official work; that identity is not upgraded or
merged later. Revoke its OIDC credential and suspend its account, then link the official's
Keycloak subject to the administrator-created identity. A subject whose link was revoked is not
provisioned again automatically.

The backend never matches or merges accounts by email, because Keycloak may not have verified it.
If the email in a first-login token equals an existing login identifier, the backend still creates
a separate identity and records `IDENTITY_POSSIBLE_DUPLICATE` for review.

The Keycloak bootstrap administrator password is in that service's Environment page. Use it once
to create named administrator accounts with MFA, then remove the bootstrap account.

## Keycloak

`deploy/keycloak/` builds Keycloak for PostgreSQL, converts Render's `DATABASE_URL`, renders the
realm from `heartstone-realm.template.json`, and imports it on first start (an existing realm is
left as it is). The `heartstone-web` client is public with PKCE (S256), has exact redirect URIs
`<origin>/auth/callback`, and adds the `heartstone-api` audience to access tokens, which the backend
requires. Its default client scopes include `basic`: since Keycloak 25 the `sub` claim comes from
that scope, and the backend rejects a token without `sub` ("Missing subject claim").

## Known limits

- Document files are stored under `/tmp` and are lost on redeploy until the object storage (R2)
  adapter lands.
- Citizen first-login provisioning creates self-service identities only. Official accounts still
  have to be linked by an administrator.
- One API instance; scale `numInstances` once documents move to object storage.
