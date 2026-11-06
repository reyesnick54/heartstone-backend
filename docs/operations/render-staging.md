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

Render generates the internal secrets (`generateValue`). These values are entered by hand in the
Render dashboard (service, then Environment), because they depend on URLs Render assigns or come
from another provider. Values marked `sync: false` in `render.yaml` are never stored in git.

| Service | Key | Value |
| --- | --- | --- |
| Keycloak | `HEARTSTONE_WEB_ORIGINS` | Space-separated https origins of the staging web apps |
| Keycloak | `KC_SMTP_PASSWORD` | Resend API key (see [Email through Resend](#email-through-resend)) |
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
to create named administrator accounts with MFA. The realm configuration step (below) signs in with
the bootstrap account by default, so before you remove it, create the configuration client described
in [Admin credentials for the configuration step](#admin-credentials-for-the-configuration-step).

## Keycloak

`deploy/keycloak/` builds Keycloak 26.0.8 for PostgreSQL with the HeartStone themes, converts
Render's `DATABASE_URL`, renders the realm from `heartstone-realm.template.json`, and imports it on
first start. `--import-realm` never touches a realm that already exists, so the settings HeartStone
owns are also applied on **every** start by `configure-realm.sh` (configuration as code).

### Configuration applied on every start

`entrypoint.sh` starts `configure-realm.sh` in the background, then starts Keycloak. The script
waits until Keycloak answers `/health/ready` on the management port (9000), signs in to the admin
API over localhost, and enforces on realm `heartstone`:

| Area | Enforced value |
| --- | --- |
| Client `heartstone-web` | Public client, standard flow only (no implicit, password, device or CIBA grants), PKCE `S256`, redirect URIs exactly `<origin>/auth/callback` and web origins exactly `<origin>` for every origin in `HEARTSTONE_WEB_ORIGINS`, post-logout redirect `+`, `heartstone-api` audience in access tokens, default client scopes include `basic`, `web-origins`, `profile`, `roles`, `email`. Created if missing. |
| Sign-in | Email as username, sign-in with email, no duplicate emails, password reset, brute-force protection on. The password policy is kept as it is (the HeartStone baseline is set only if the realm has none). |
| Email | SMTP from `KC_SMTP_*` when `KC_SMTP_HOST` is set (see below). |
| Self-registration | On, with email verification, only when `HEARTSTONE_SELF_REGISTRATION=true`, email was configured on this start, and new users get nothing beyond Keycloak's account defaults (`default-roles-heartstone` holds only `offline_access`, `uma_authorization`, `view-profile`, `manage-account`, and there are no default groups). Otherwise off, with the reason in the log. Email confirmation links last 12 hours. |
| Appearance | Login and email theme `HEARTSTONE_THEME`; realm display name `HEARTSTONE_REALM_DISPLAY_NAME` when set. |

Everything else (users, other clients, MFA, password policy, sessions) keeps the values set in the
admin console. Changes to the enforced values in the console are overwritten on the next restart,
so change them through `render.yaml` or the service environment instead.

Each step logs a line starting `[heartstone-config]`. A step that fails logs `ERROR` and the others
still run; the script never stops Keycloak and never prints passwords or keys. After a deploy, check
the Keycloak service log for `[heartstone-config] Realm configuration applied.`

Self-registered accounts are basic: the email address is verified, the person's identity is not.
HeartStone creates a citizen account with no roles on first sign-in (see above).

### Keycloak environment

| Key | Default | Purpose |
| --- | --- | --- |
| `HEARTSTONE_WEB_ORIGINS` | required | Space-separated `https://` origins of the web apps |
| `HEARTSTONE_API_AUDIENCE` | `heartstone-api` | Audience added to access tokens |
| `HEARTSTONE_THEME` | `heartstone` | Login and email theme (`heartstone-absez` on staging) |
| `HEARTSTONE_TENANT_NAME` | theme's own | Name in page titles, header text, official statement and emails |
| `HEARTSTONE_REALM_DISPLAY_NAME` | unchanged | Realm display name |
| `HEARTSTONE_DEV_BANNER` | `true` | `false` removes the development-build banner from pages and emails |
| `HEARTSTONE_SELF_REGISTRATION` | `false` | `true` opens public "Create your digital ID" (needs working email) |
| `KC_SMTP_HOST` | unset | SMTP server; unset leaves the realm's email settings as they are |
| `KC_SMTP_PORT` | `587` | `465` uses implicit TLS, other ports STARTTLS (`KC_SMTP_SSL`, `KC_SMTP_STARTTLS` override) |
| `KC_SMTP_FROM`, `KC_SMTP_FROM_DISPLAY_NAME` | required, empty | Sender address and name |
| `KC_SMTP_USER`, `KC_SMTP_PASSWORD` | unset | SMTP login. A user without a password leaves email unconfigured |
| `HEARTSTONE_VERIFY_EMAIL_LINK_LIFESPAN_SECONDS` | `43200` | How long email confirmation links work |
| `HEARTSTONE_CONFIGURE_REALM` | `true` | `false` skips the configuration step entirely |
| `HEARTSTONE_CONFIG_CLIENT_ID`, `HEARTSTONE_CONFIG_CLIENT_SECRET` | unset | Admin credentials for the step (below) |

If `KC_SMTP_PASSWORD` is empty, the log says `Email NOT configured: KC_SMTP_PASSWORD is empty` and
`Self-registration requested but kept OFF`; sign-in keeps working, but nobody can create an account.

### Admin credentials for the configuration step

By default the step signs in as the bootstrap administrator (`KC_BOOTSTRAP_ADMIN_USERNAME` and
`KC_BOOTSTRAP_ADMIN_PASSWORD`). To remove that account, first give the step its own client that can
manage only the `heartstone` realm:

1. In the `master` realm, create client `heartstone-config`: client authentication on, service
   account roles on, every other flow off.
2. Under its Service account roles, assign the `heartstone-realm` client roles `view-realm`,
   `manage-realm`, `view-clients` and `manage-clients` (nothing in `master`).
3. In Render, add `HEARTSTONE_CONFIG_CLIENT_ID=heartstone-config` and
   `HEARTSTONE_CONFIG_CLIENT_SECRET=<the client secret>` to the Keycloak service, then redeploy and
   check the log for `Realm configuration applied.`

`HEARTSTONE_CONFIG_ADMIN_USERNAME` and `HEARTSTONE_CONFIG_ADMIN_PASSWORD` can name another master
administrator instead, but the client is preferred.

### Adding a web origin or a domain

Web origins are configuration, not code. To add one (for example `https://absez.org` when the
production domain is attached), edit `HEARTSTONE_WEB_ORIGINS` on the Keycloak service in Render,
save, and let it redeploy. The new origin gets `/auth/callback` as its redirect URI, and origins
no longer listed stop working.

To serve Keycloak on its own domain (for example `id.absez.org`): add the custom domain to the
Keycloak service in Render and the DNS record in Cloudflare, set `KC_HOSTNAME=https://id.absez.org`
on the service (it overrides Render's URL), redeploy, and then update `issuer` and `jwksUri` in
`OIDC_PROVIDERS_JSON` on the API and worker and the Keycloak URL in the web apps' configuration.

### Theme and branding

Themes are in `deploy/keycloak/themes/`:

- `heartstone/` is tenant-neutral: layout (`login/template.ftl`, copied from Keycloak 26.0.8
  `keycloak.v2`), registration explanation (`login/register.ftl`), wording
  (`login/messages`, `email/messages`), styles (`login/resources/css/heartstone.css`) and branded
  email templates. It reads the tenant name and the banner switch from `theme.properties`, which
  takes them from `HEARTSTONE_TENANT_NAME` and `HEARTSTONE_DEV_BANNER`.
- `heartstone-absez/` holds only what is specific to the ABSEZ e-Gov Platform: `parent=heartstone`,
  the tenant name, and the lockup with the Antigua and Barbuda coat of arms
  (`login/resources/img`, from the frontend repo's `design/brand/logo/`).

For another government, copy `heartstone-absez/` to `heartstone-<tenant>/`, replace the images and
`hsTenantName`/`hsLogo`/`hsLogoAlt`/`hsFavicon`, add `messages/messages_en.properties` for any
wording that differs, and set `HEARTSTONE_THEME` on that deployment. When Keycloak is upgraded,
re-copy `template.ftl` and `register.ftl` from the new `keycloak.v2` theme and re-apply the
changes marked "HeartStone".

The development-build banner ("Development build: do not use real personal information") is on
unless `HEARTSTONE_DEV_BANNER=false`. Set it to `false` only on production, then redeploy.

### Email through Resend

Keycloak sends verification and password-reset emails through Resend's SMTP service
(`smtp.resend.com`, port 587 with STARTTLS, user `resend`, password = API key) from
`no-reply@absez.org` as "ABSEZ e-Gov Platform". One-time setup:

1. Create a Resend account (https://resend.com) for the ABSEZ e-Gov Platform.
2. In Resend, go to Domains, add `absez.org`, and choose the region closest to the users.
3. Resend lists DNS records (an MX and a TXT record for the sending subdomain, a DKIM TXT record,
   and optionally DMARC). Add each one in Cloudflare (DNS, Records) exactly as shown, with the
   proxy status set to "DNS only". Then select Verify in Resend and wait until the domain shows
   Verified.
4. In Resend, go to API Keys, create a key with **Sending access** only, restricted to `absez.org`.
   Copy it once; Resend does not show it again.
5. In Render, open `heartstone-keycloak-staging`, Environment, set `KC_SMTP_PASSWORD` to the key,
   and save. Never put the key in git, chat or tickets.
6. After the redeploy, check the log for `Email: SMTP smtp.resend.com:587` and
   `self-registration ON with email verification`. In the admin console (Realm settings, Email,
   Test connection) send a test email to an administrator's own address.

To rotate the key, create a new one in Resend, replace `KC_SMTP_PASSWORD` in Render, wait for the
redeploy, then delete the old key.

## Known limits

- Document files are stored under `/tmp` and are lost on redeploy until the object storage (R2)
  adapter lands.
- Citizen first-login provisioning creates self-service identities only. Official accounts still
  have to be linked by an administrator.
- One API instance; scale `numInstances` once documents move to object storage.
- Self-registration has no CAPTCHA or rate limit beyond brute-force protection on sign-in. Add one
  before the public launch.
