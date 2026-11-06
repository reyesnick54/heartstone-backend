#!/bin/bash
# CI smoke test for the Keycloak image: starts it twice against one PostgreSQL database and checks
# that the realm configuration is applied to a brand-new realm AND re-applied to the existing realm
# on the next start (the case --import-realm does not cover). Needs Docker and curl.
#
#   deploy/keycloak/smoke-test.sh [image]        (default image: heartstone-keycloak:ci)
set -euo pipefail

IMAGE="${1:-heartstone-keycloak:ci}"
NETWORK="hs-kc-smoke-$$"
DB="hs-kc-smoke-db-$$"
KC="hs-kc-smoke-$$"
BASE="http://localhost:18080"
ADMIN_PASSWORD="smoke-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"
SMTP_PASSWORD="re_smoke_$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"
CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

cleanup() {
  docker rm -f "${KC}" "${DB}" >/dev/null 2>&1 || true
  docker network rm "${NETWORK}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

kc_log() {
  docker logs "${KC}" 2>&1 || true
}

# Fails unless the Keycloak log contains the literal text.
expect_log() {
  local log
  log="$(kc_log)"
  [[ "${log}" == *"$1"* ]] || fail "$2"
}

fail() {
  echo "SMOKE TEST FAILED: $*" >&2
  echo "----- Keycloak log -----" >&2
  kc_log | tail -n 200 >&2
  exit 1
}

auth_url() {
  local endpoint="$1" origin="$2"
  printf '%s/realms/heartstone/protocol/openid-connect/%s?client_id=heartstone-web&response_type=code&scope=openid&redirect_uri=%s%%2Fauth%%2Fcallback&code_challenge=%s&code_challenge_method=S256' \
    "${BASE}" "${endpoint}" "${origin//:/%3A}" "${CHALLENGE}"
}

start_keycloak() {
  local origins="$1" smtp_password="$2"
  docker rm -f "${KC}" >/dev/null 2>&1 || true
  docker run -d --name "${KC}" --network "${NETWORK}" -p 127.0.0.1:18080:8080 \
    -e DATABASE_URL="postgres://keycloak:keycloak@${DB}:5432/keycloak" \
    -e KC_HOSTNAME="${BASE}" \
    -e KC_CACHE=local \
    -e KC_BOOTSTRAP_ADMIN_USERNAME=smoke-admin \
    -e KC_BOOTSTRAP_ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
    -e HEARTSTONE_WEB_ORIGINS="${origins}" \
    -e HEARTSTONE_THEME=heartstone-absez \
    -e HEARTSTONE_SELF_REGISTRATION=true \
    -e KC_SMTP_HOST=smtp.example.test \
    -e KC_SMTP_PORT=587 \
    -e KC_SMTP_FROM=no-reply@example.test \
    -e KC_SMTP_USER=smoke \
    -e KC_SMTP_PASSWORD="${smtp_password}" \
    "${IMAGE}" >/dev/null

  local waited=0 log
  while true; do
    log="$(kc_log)"
    [[ "${log}" == *"[heartstone-config] ERROR"* ]] && fail "configuration reported an error"
    [[ "${log}" == *"[heartstone-config] Realm configuration applied."* ]] && break
    [[ "$(docker inspect -f '{{.State.Running}}' "${KC}")" == "true" ]] || fail "Keycloak exited"
    ((waited < 420)) || fail "configuration did not finish within 420s"
    sleep 5
    waited=$((waited + 5))
  done
}

check_no_secrets_in_log() {
  local log
  log="$(kc_log)"
  [[ "${log}" != *"${ADMIN_PASSWORD}"* ]] || fail "admin password appears in the log"
  [[ "${log}" != *"${SMTP_PASSWORD}"* ]] || fail "SMTP password appears in the log"
}

status_of() {
  curl -s -o /dev/null -w '%{http_code}' "$1"
}

docker network create "${NETWORK}" >/dev/null
docker run -d --name "${DB}" --network "${NETWORK}" \
  -e POSTGRES_USER=keycloak -e POSTGRES_PASSWORD=keycloak -e POSTGRES_DB=keycloak \
  postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "${DB}" pg_isready -U keycloak -d keycloak >/dev/null 2>&1 && break
  sleep 2
done

echo "1. New realm, no SMTP password: imported, configured, registration kept off."
start_keycloak "https://one.example.test" ""
expect_log "Email NOT configured: KC_SMTP_PASSWORD is empty" "missing warning about the empty SMTP password"
expect_log "Self-registration requested but kept OFF" "registration was not kept off without email"
page="$(curl -fsS "$(auth_url auth https://one.example.test)")" || fail "login page did not load"
for marker in hs-official-bar "Development build" absez-lockup-light.png "Sign in with your digital ID"; do
  [[ "${page}" == *"${marker}"* ]] || fail "login page lacks '${marker}'"
done
[[ "${page}" != *"login-actions/registration"* ]] || fail "registration link shown without email"
check_no_secrets_in_log

echo "2. Existing realm, new origin and SMTP password: settings re-applied on restart."
start_keycloak "https://two.example.test" "${SMTP_PASSWORD}"
expect_log "self-registration ON with email verification" "registration was not switched on"
[[ "$(status_of "$(auth_url auth https://two.example.test)")" == "200" ]] || fail "new origin rejected"
[[ "$(status_of "$(auth_url auth https://one.example.test)")" == "400" ]] || fail "removed origin still accepted"
page="$(curl -fsS "$(auth_url auth https://two.example.test)")" || fail "login page did not load"
[[ "${page}" == *"login-actions/registration"* ]] || fail "registration link missing"
page="$(curl -fsS "$(auth_url registrations https://two.example.test)")" || fail "registration page did not load"
for marker in "Create your digital ID" "This creates a basic digital ID"; do
  [[ "${page}" == *"${marker}"* ]] || fail "registration page lacks '${marker}'"
done
check_no_secrets_in_log

echo "Keycloak smoke test passed."
