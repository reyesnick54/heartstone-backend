# HeartStone identity provider (Keycloak) for Render.
# Builds an optimised Keycloak for PostgreSQL and imports the HeartStone realm on first start.
ARG KEYCLOAK_IMAGE=quay.io/keycloak/keycloak:26.0

FROM ${KEYCLOAK_IMAGE} AS builder
ENV KC_DB=postgres \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=false
RUN /opt/keycloak/bin/kc.sh build

FROM ${KEYCLOAK_IMAGE}
COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY --chown=keycloak:keycloak heartstone-realm.template.json /opt/keycloak/templates/heartstone-realm.template.json
COPY --chown=keycloak:keycloak entrypoint.sh /opt/keycloak/bin/heartstone-entrypoint.sh
ENV KC_DB=postgres \
    KC_HTTP_ENABLED=true \
    KC_HTTP_PORT=8080 \
    KC_PROXY_HEADERS=xforwarded \
    KC_HEALTH_ENABLED=true
EXPOSE 8080
ENTRYPOINT ["/bin/bash", "/opt/keycloak/bin/heartstone-entrypoint.sh"]
