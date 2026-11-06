#!/bin/bash
# Translates Render's DATABASE_URL into Keycloak settings, renders the realm template from
# environment values, then starts Keycloak. Secrets are never printed.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

# postgres://user:password@host:port/database[?params]
if [[ ! "${DATABASE_URL}" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+)(:([0-9]+))?/([^?]+) ]]; then
  echo "DATABASE_URL is not in postgres://user:password@host[:port]/database form" >&2
  exit 1
fi
export KC_DB_USERNAME="${BASH_REMATCH[2]}"
export KC_DB_PASSWORD="${BASH_REMATCH[3]}"
export KC_DB_URL="jdbc:postgresql://${BASH_REMATCH[4]}:${BASH_REMATCH[6]:-5432}/${BASH_REMATCH[7]}"

# Public URL: explicit KC_HOSTNAME, else Render's external URL for this service.
export KC_HOSTNAME="${KC_HOSTNAME:-${RENDER_EXTERNAL_URL:-}}"
if [[ -z "${KC_HOSTNAME}" ]]; then
  echo "KC_HOSTNAME or RENDER_EXTERNAL_URL is required" >&2
  exit 1
fi

: "${HEARTSTONE_WEB_ORIGINS:?HEARTSTONE_WEB_ORIGINS is required (space-separated https origins)}"
: "${HEARTSTONE_API_AUDIENCE:=heartstone-api}"
: "${HEARTSTONE_REALM_DISPLAY_NAME:=HeartStone (staging)}"

# Build redirect URI and web-origin JSON arrays from the space-separated origin list.
redirects=""
origins=""
for origin in ${HEARTSTONE_WEB_ORIGINS}; do
  if [[ ! "${origin}" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
    echo "Invalid origin in HEARTSTONE_WEB_ORIGINS: ${origin}" >&2
    exit 1
  fi
  redirects+="\"${origin}/auth/callback\","
  origins+="\"${origin}\","
done
redirects="[${redirects%,}]"
origins="[${origins%,}]"

mkdir -p /opt/keycloak/data/import
sed \
  -e "s|__REDIRECT_URIS__|${redirects}|" \
  -e "s|__WEB_ORIGINS__|${origins}|" \
  -e "s|__API_AUDIENCE__|${HEARTSTONE_API_AUDIENCE}|" \
  -e "s|__REALM_DISPLAY_NAME__|${HEARTSTONE_REALM_DISPLAY_NAME}|" \
  /opt/keycloak/templates/heartstone-realm.template.json \
  > /opt/keycloak/data/import/heartstone-realm.json

# --import-realm only creates a realm that does not exist yet. configure-realm.sh then applies the
# settings HeartStone owns (client, sign-in, email, theme) to the realm on every start, once
# Keycloak is ready. It runs in the background, logs with a [heartstone-config] prefix, and never
# stops Keycloak; settings it does not own keep any edits made in the admin console.
if [[ "${HEARTSTONE_CONFIGURE_REALM:-true}" == "true" ]]; then
  /bin/bash /opt/keycloak/bin/heartstone-configure-realm.sh &
else
  echo "[heartstone-config] HEARTSTONE_CONFIGURE_REALM is not true; realm configuration is not enforced."
fi

exec /opt/keycloak/bin/kc.sh start --optimized --import-realm
