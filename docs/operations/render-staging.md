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
    "allowedAlgorithms": ["RS256"]
  }
]
```

The Keycloak bootstrap administrator password is in that service's Environment page. Use it once
to create named administrator accounts with MFA, then remove the bootstrap account.

## Keycloak

`deploy/keycloak/` builds Keycloak for PostgreSQL, converts Render's `DATABASE_URL`, renders the
realm from `heartstone-realm.template.json`, and imports it on first start (an existing realm is
left as it is). The `heartstone-web` client is public with PKCE (S256), has exact redirect URIs
`<origin>/auth/callback`, and adds the `heartstone-api` audience to access tokens, which the backend
requires.

## Known limits

- Document files are stored under `/tmp` and are lost on redeploy until the object storage (R2)
  adapter lands.
- The backend accepts sign-in only for identities already linked to a Keycloak account; citizen
  first-login provisioning is pending.
- One API instance; scale `numInstances` once documents move to object storage.
