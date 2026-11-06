#!/bin/bash
# Applies the HeartStone realm configuration to a running Keycloak. Run in the background by
# entrypoint.sh on every start, because --import-realm only creates a realm that does not exist yet.
#
# It waits until Keycloak reports ready, signs in to the admin API over localhost and, on realm
# HEARTSTONE_REALM (default "heartstone"), enforces:
#   - client heartstone-web: public, standard flow only, PKCE S256, redirect URIs and web origins
#     from HEARTSTONE_WEB_ORIGINS, API audience mapper, default client scopes;
#   - sign-in settings: email as username, email login, password reset, brute-force protection;
#   - SMTP from KC_SMTP_* when KC_SMTP_HOST is set;
#   - self-registration with email verification when HEARTSTONE_SELF_REGISTRATION=true and email
#     works, and only if new users receive no roles or groups beyond Keycloak's account defaults;
#   - login and email theme HEARTSTONE_THEME, and a 12-hour (configurable) email confirmation link.
#
# Every step is idempotent. A failure is logged as ERROR and the remaining steps still run; the
# script never stops Keycloak. Secrets are passed through the environment or stdin, never argv,
# and are never printed.
set -uo pipefail
umask 077

log() { printf '[heartstone-config] %s\n' "$*"; }
warn() { printf '[heartstone-config] WARNING: %s\n' "$*"; }
err() { printf '[heartstone-config] ERROR: %s\n' "$*" >&2; }

KC_HOME="${KC_HOME:-/opt/keycloak}"
KCADM="${KC_HOME}/bin/kcadm.sh"
REALM="${HEARTSTONE_REALM:-heartstone}"
CLIENT_ID="${HEARTSTONE_WEB_CLIENT_ID:-heartstone-web}"
API_AUDIENCE="${HEARTSTONE_API_AUDIENCE:-heartstone-api}"
THEME="${HEARTSTONE_THEME:-heartstone}"
SELF_REGISTRATION="${HEARTSTONE_SELF_REGISTRATION:-false}"
HTTP_PORT="${KC_HTTP_PORT:-8080}"
MANAGEMENT_PORT="${KC_HTTP_MANAGEMENT_PORT:-9000}"
READY_TIMEOUT_SECONDS="${HEARTSTONE_CONFIG_READY_TIMEOUT_SECONDS:-900}"
# How long the link in a "confirm your email" message works (Keycloak's default is 5 minutes).
VERIFY_EMAIL_LINK_SECONDS="${HEARTSTONE_VERIFY_EMAIL_LINK_LIFESPAN_SECONDS:-43200}"
BASELINE_PASSWORD_POLICY="length(12) and notUsername and notEmail"
REQUIRED_DEFAULT_SCOPES=(basic web-origins profile roles email)
# Keycloak's own defaults for a new user: account self-service only, no HeartStone authority.
ALLOWED_DEFAULT_ROLES=" offline_access uma_authorization view-profile manage-account "

# The admin CLI starts a JVM per call; keep it small next to the running server.
export KC_OPTS="${HEARTSTONE_CONFIG_CLI_OPTS:--Xmx128m -XX:+UseSerialGC -XX:TieredStopAtLevel=1}"

WORK_DIR="$(mktemp -d)"
KCADM_CONFIG="${WORK_DIR}/kcadm.config"
trap 'rm -rf "${WORK_DIR}"' EXIT

failures=0
fail() {
  err "$*"
  failures=$((failures + 1))
}

kcadm() {
  "${KCADM}" "$@" --config "${KCADM_CONFIG}"
}

# JSON string literal for a shell value (no control characters expected in configuration).
json_str() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '"%s"' "${s}"
}

is_true() {
  case "${1,,}" in
    true | yes | 1 | on) return 0 ;;
    *) return 1 ;;
  esac
}

# HTTP GET over bash's /dev/tcp (the Keycloak image has no curl); succeeds on status 200.
# Runs in a subshell so that a refused connection cannot end this script.
http_ok() (
  port="$1" path="$2" status=""
  exec 3<>"/dev/tcp/127.0.0.1/${port}" || exit 1
  printf 'GET %s HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n' "${path}" >&3
  IFS= read -r -t 10 status <&3 || status=""
  [[ "${status}" =~ ^HTTP/[0-9.]+\ 200 ]]
)

wait_until_ready() {
  local waited=0
  until http_ok "${MANAGEMENT_PORT}" /health/ready 2>/dev/null; do
    if ((waited >= READY_TIMEOUT_SECONDS)); then
      return 1
    fi
    sleep 5
    waited=$((waited + 5))
  done
}

sign_in() {
  local server="http://127.0.0.1:${HTTP_PORT}"
  if [[ -n "${HEARTSTONE_CONFIG_CLIENT_ID:-}" ]]; then
    # Service-account client in the master realm, with realm-management roles for this realm only.
    KC_CLI_CLIENT_SECRET="${HEARTSTONE_CONFIG_CLIENT_SECRET:-}" \
      kcadm config credentials --server "${server}" --realm master \
      --client "${HEARTSTONE_CONFIG_CLIENT_ID}" >/dev/null
  else
    local user="${HEARTSTONE_CONFIG_ADMIN_USERNAME:-${KC_BOOTSTRAP_ADMIN_USERNAME:-}}"
    local password="${HEARTSTONE_CONFIG_ADMIN_PASSWORD:-${KC_BOOTSTRAP_ADMIN_PASSWORD:-}}"
    if [[ -z "${user}" || -z "${password}" ]]; then
      err "No admin credentials (HEARTSTONE_CONFIG_CLIENT_ID/SECRET, HEARTSTONE_CONFIG_ADMIN_USERNAME/PASSWORD or KC_BOOTSTRAP_ADMIN_USERNAME/PASSWORD)."
      return 1
    fi
    KC_CLI_PASSWORD="${password}" \
      kcadm config credentials --server "${server}" --realm master --user "${user}" >/dev/null
  fi
}

# --- heartstone-web client ----------------------------------------------------------------------

build_origin_arrays() {
  local origin
  redirect_uris=""
  web_origins=""
  for origin in ${HEARTSTONE_WEB_ORIGINS:-}; do
    origin="${origin%/}"
    if [[ ! "${origin}" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
      fail "Skipping invalid origin in HEARTSTONE_WEB_ORIGINS: ${origin}"
      continue
    fi
    redirect_uris+="$(json_str "${origin}/auth/callback"),"
    web_origins+="$(json_str "${origin}"),"
  done
  redirect_uris="[${redirect_uris%,}]"
  web_origins="[${web_origins%,}]"
}

client_json() {
  cat <<JSON
{
  "clientId": $(json_str "${CLIENT_ID}"),
  "enabled": true,
  "protocol": "openid-connect",
  "publicClient": true,
  "bearerOnly": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "frontchannelLogout": true,
  "redirectUris": ${redirect_uris},
  "webOrigins": ${web_origins},
  "attributes": {
    "pkce.code.challenge.method": "S256",
    "post.logout.redirect.uris": "+",
    "oauth2.device.authorization.grant.enabled": "false",
    "oidc.ciba.grant.enabled": "false"
  }
}
JSON
}

audience_mapper_json() {
  local id_field=""
  if [[ -n "${1:-}" ]]; then
    id_field="\"id\": $(json_str "$1"),"
  fi
  cat <<JSON
{
  ${id_field}
  "name": "heartstone-api-audience",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-audience-mapper",
  "consentRequired": false,
  "config": {
    "included.custom.audience": $(json_str "${API_AUDIENCE}"),
    "id.token.claim": "false",
    "access.token.claim": "true",
    "introspection.token.claim": "true"
  }
}
JSON
}

client_uuid() {
  kcadm get clients -r "${REALM}" -q "clientId=${CLIENT_ID}" --fields id --format csv --noquotes |
    head -n 1
}

configure_client() {
  local uuid
  build_origin_arrays
  if [[ "${redirect_uris}" == "[]" ]]; then
    fail "HEARTSTONE_WEB_ORIGINS has no valid origin; client ${CLIENT_ID} left unchanged."
    return
  fi

  if ! uuid="$(client_uuid)"; then
    fail "Could not look up client ${CLIENT_ID}."
    return
  fi
  if [[ -z "${uuid}" ]]; then
    if client_json | kcadm create clients -r "${REALM}" -i -f - >/dev/null; then
      log "Created client ${CLIENT_ID}."
      uuid="$(client_uuid)" || uuid=""
    else
      fail "Could not create client ${CLIENT_ID}."
      return
    fi
  elif client_json | kcadm update "clients/${uuid}" -r "${REALM}" --merge -f - >/dev/null; then
    log "Client ${CLIENT_ID}: public, standard flow only, PKCE S256, redirect URIs and web origins for ${HEARTSTONE_WEB_ORIGINS}."
  else
    fail "Could not update client ${CLIENT_ID}."
  fi
  [[ -n "${uuid}" ]] || return

  configure_audience_mapper "${uuid}"
  configure_default_scopes "${uuid}"
}

configure_audience_mapper() {
  local uuid="$1" mappers mapper_id="" id name
  if ! mappers="$(kcadm get "clients/${uuid}/protocol-mappers/models" -r "${REALM}" --fields id,name --format csv --noquotes)"; then
    fail "Could not read protocol mappers of ${CLIENT_ID}."
    return
  fi
  while IFS=, read -r id name; do
    [[ "${name}" == "heartstone-api-audience" ]] && mapper_id="${id}"
  done <<<"${mappers}"

  if [[ -z "${mapper_id}" ]]; then
    if audience_mapper_json | kcadm create "clients/${uuid}/protocol-mappers/models" -r "${REALM}" -i -f - >/dev/null; then
      log "Added audience ${API_AUDIENCE} to ${CLIENT_ID} access tokens."
    else
      fail "Could not add the ${API_AUDIENCE} audience mapper to ${CLIENT_ID}."
    fi
  elif audience_mapper_json "${mapper_id}" |
    kcadm update "clients/${uuid}/protocol-mappers/models/${mapper_id}" -r "${REALM}" -f - >/dev/null; then
    log "Access tokens of ${CLIENT_ID} carry audience ${API_AUDIENCE}."
  else
    fail "Could not update the ${API_AUDIENCE} audience mapper of ${CLIENT_ID}."
  fi
}

configure_default_scopes() {
  local uuid="$1" realm_scopes client_defaults client_optionals scope id name scope_id
  if ! realm_scopes="$(kcadm get client-scopes -r "${REALM}" --fields id,name --format csv --noquotes)" ||
    ! client_defaults="$(kcadm get "clients/${uuid}/default-client-scopes" -r "${REALM}" --fields name --format csv --noquotes)" ||
    ! client_optionals="$(kcadm get "clients/${uuid}/optional-client-scopes" -r "${REALM}" --fields id,name --format csv --noquotes)"; then
    fail "Could not read client scopes of ${CLIENT_ID}."
    return
  fi

  for scope in "${REQUIRED_DEFAULT_SCOPES[@]}"; do
    if grep -qx -- "${scope}" <<<"${client_defaults}"; then
      continue
    fi
    scope_id=""
    while IFS=, read -r id name; do
      [[ "${name}" == "${scope}" ]] && scope_id="${id}"
    done <<<"${realm_scopes}"
    if [[ -z "${scope_id}" ]]; then
      fail "Client scope ${scope} does not exist in realm ${REALM}; add it in the admin console."
      continue
    fi
    # A scope cannot be both optional and default for the same client.
    while IFS=, read -r id name; do
      if [[ "${name}" == "${scope}" ]]; then
        kcadm delete "clients/${uuid}/optional-client-scopes/${id}" -r "${REALM}" >/dev/null ||
          fail "Could not remove ${scope} from the optional scopes of ${CLIENT_ID}."
      fi
    done <<<"${client_optionals}"
    if kcadm update "clients/${uuid}/default-client-scopes/${scope_id}" -r "${REALM}" -b '{}' >/dev/null; then
      log "Added default client scope ${scope} to ${CLIENT_ID}."
    else
      fail "Could not add default client scope ${scope} to ${CLIENT_ID}."
    fi
  done
}

# --- email --------------------------------------------------------------------------------------

smtp_ready=false
smtp_reason=""

configure_smtp() {
  if [[ -z "${KC_SMTP_HOST:-}" ]]; then
    smtp_reason="KC_SMTP_HOST is not set"
    log "Email: ${smtp_reason}; SMTP settings left as they are."
    return
  fi
  if [[ -z "${KC_SMTP_FROM:-}" ]]; then
    smtp_reason="KC_SMTP_FROM is not set"
    warn "Email NOT configured: ${smtp_reason}."
    return
  fi
  if [[ -n "${KC_SMTP_USER:-}" && -z "${KC_SMTP_PASSWORD:-}" ]]; then
    smtp_reason="KC_SMTP_PASSWORD is empty"
    warn "Email NOT configured: ${smtp_reason}. Enter the SMTP password (for Resend, the API key) in the Keycloak service's environment and redeploy."
    return
  fi

  local port="${KC_SMTP_PORT:-587}" ssl starttls auth="false" credentials=",
    \"user\": \"\",
    \"password\": \"\""
  if [[ ! "${port}" =~ ^[0-9]+$ ]]; then
    smtp_reason="KC_SMTP_PORT is not a number"
    fail "Email NOT configured: ${smtp_reason}."
    return
  fi
  # 465 is implicit TLS; other ports use STARTTLS. Either can be forced with KC_SMTP_SSL/STARTTLS.
  if [[ "${port}" == "465" ]]; then ssl=true starttls=false; else ssl=false starttls=true; fi
  if [[ -n "${KC_SMTP_SSL:-}" ]]; then
    if is_true "${KC_SMTP_SSL}"; then ssl=true; else ssl=false; fi
  fi
  if [[ -n "${KC_SMTP_STARTTLS:-}" ]]; then
    if is_true "${KC_SMTP_STARTTLS}"; then starttls=true; else starttls=false; fi
  fi
  if [[ -n "${KC_SMTP_USER:-}" ]]; then
    auth="true"
    credentials=",
    \"user\": $(json_str "${KC_SMTP_USER}"),
    \"password\": $(json_str "${KC_SMTP_PASSWORD}")"
  fi

  # The request carries the password, so any CLI error text is scrubbed before it is logged.
  local output
  if output="$(kcadm update "realms/${REALM}" --merge -f - 2>&1 >/dev/null <<JSON
{
  "smtpServer": {
    "host": $(json_str "${KC_SMTP_HOST}"),
    "port": $(json_str "${port}"),
    "from": $(json_str "${KC_SMTP_FROM}"),
    "fromDisplayName": $(json_str "${KC_SMTP_FROM_DISPLAY_NAME:-}"),
    "replyTo": $(json_str "${KC_SMTP_REPLY_TO:-}"),
    "ssl": "${ssl}",
    "starttls": "${starttls}",
    "auth": "${auth}"${credentials}
  }
}
JSON
)"; then
    smtp_ready=true
    log "Email: SMTP ${KC_SMTP_HOST}:${port} (ssl=${ssl}, starttls=${starttls}, auth=${auth}) from ${KC_SMTP_FROM}."
  else
    if [[ -n "${KC_SMTP_PASSWORD:-}" ]]; then
      output="${output//"${KC_SMTP_PASSWORD}"/[redacted]}"
    fi
    smtp_reason="the SMTP settings could not be saved"
    fail "Email NOT configured: ${smtp_reason}. ${output}"
  fi
}

# --- realm sign-in settings ---------------------------------------------------------------------

# New users must get nothing beyond Keycloak's account defaults: no HeartStone roles or groups.
new_users_get_no_extra_access() {
  local composites groups role extra=""
  if ! composites="$(kcadm get "roles/default-roles-${REALM,,}/composites" -r "${REALM}" --fields name --format csv --noquotes)" ||
    ! groups="$(kcadm get default-groups -r "${REALM}" --fields path --format csv --noquotes)"; then
    registration_block="the realm's default roles and groups could not be checked"
    return 1
  fi
  while IFS= read -r role; do
    [[ -z "${role}" ]] && continue
    [[ "${ALLOWED_DEFAULT_ROLES}" == *" ${role} "* ]] || extra+=" ${role}"
  done <<<"${composites}"
  if [[ -n "${extra}" ]]; then
    registration_block="default-roles-${REALM,,} grants extra roles to new users:${extra}"
    return 1
  fi
  if [[ -n "${groups//[[:space:]]/}" ]]; then
    registration_block="the realm puts new users in default groups: ${groups//$'\n'/ }"
    return 1
  fi
}

configure_realm() {
  local registration=false verify_email_field="" policy_field="" display_field="" current_policy
  registration_block=""

  if is_true "${SELF_REGISTRATION}"; then
    if [[ "${smtp_ready}" != true ]]; then
      registration_block="email is not configured (${smtp_reason:-unknown reason}), so addresses could not be verified"
    elif new_users_get_no_extra_access; then
      registration=true
      verify_email_field='"verifyEmail": true,'
    fi
    if [[ "${registration}" != true ]]; then
      warn "Self-registration requested but kept OFF: ${registration_block}."
    fi
  fi

  if current_policy="$(kcadm get "realms/${REALM}" --fields passwordPolicy --format csv --noquotes)"; then
    if [[ -z "${current_policy//[[:space:]]/}" ]]; then
      policy_field="\"passwordPolicy\": $(json_str "${BASELINE_PASSWORD_POLICY}"),"
      warn "Realm had no password policy; applied the HeartStone baseline (${BASELINE_PASSWORD_POLICY})."
    fi
  else
    fail "Could not read the password policy of realm ${REALM}; it is left unchanged."
  fi

  if [[ ! "${VERIFY_EMAIL_LINK_SECONDS}" =~ ^[1-9][0-9]*$ ]]; then
    fail "HEARTSTONE_VERIFY_EMAIL_LINK_LIFESPAN_SECONDS is not a positive number; using 43200."
    VERIFY_EMAIL_LINK_SECONDS=43200
  fi

  if [[ -n "${HEARTSTONE_REALM_DISPLAY_NAME:-}" ]]; then
    display_field="\"displayName\": $(json_str "${HEARTSTONE_REALM_DISPLAY_NAME}"),"
  fi

  if kcadm update "realms/${REALM}" --merge -f - >/dev/null <<JSON; then
{
  ${display_field}
  ${verify_email_field}
  ${policy_field}
  "registrationAllowed": ${registration},
  "registrationEmailAsUsername": true,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "bruteForceProtected": true,
  "loginTheme": $(json_str "${THEME}"),
  "emailTheme": $(json_str "${THEME}"),
  "attributes": {
    "actionTokenGeneratedByUserLifespan.verify-email": $(json_str "${VERIFY_EMAIL_LINK_SECONDS}")
  }
}
JSON
    log "Realm ${REALM}: self-registration $([[ ${registration} == true ]] && echo 'ON with email verification' || echo OFF), email as username, password reset on, brute-force protection on, theme ${THEME}."
  else
    fail "Could not update the sign-in settings of realm ${REALM}."
  fi
}

# --- main ---------------------------------------------------------------------------------------

main() {
  log "Waiting for Keycloak to be ready on management port ${MANAGEMENT_PORT}."
  if ! wait_until_ready; then
    err "Keycloak was not ready after ${READY_TIMEOUT_SECONDS}s; realm configuration NOT applied."
    return 1
  fi
  if ! sign_in; then
    err "Could not sign in to the admin API; realm configuration NOT applied. Check the admin credentials described in docs/operations/render-staging.md."
    return 1
  fi
  if ! kcadm get "realms/${REALM}" --fields realm >/dev/null; then
    err "Realm ${REALM} not found; realm configuration NOT applied."
    return 1
  fi

  configure_client
  configure_smtp
  configure_realm

  if ((failures > 0)); then
    err "Realm configuration finished with ${failures} error(s); see the messages above."
    return 1
  fi
  log "Realm configuration applied."
}

main "$@"
