# HeartStone Service-Pack Authoring Toolkit

Declarative authoring manifests for configuring government departments and service families without manually editing hundreds of database records or writing new backend code for every service.

**All content in this directory is NON_PRODUCTION / TEMPLATE ONLY.** It demonstrates architecture and authoring patterns only — not verified law, policy, or production authority assignments.

## Layout

| Path | Purpose |
|---|---|
| `schemas/` | JSON Schema contract for service-pack manifests |
| `templates/` | Ten canonical service-family templates |
| `examples/` | NON_PRODUCTION example manifests (mirrors templates) |
| `tooling/` | Pointer to CLI scripts under `scripts/service-pack-cli.ts` |

## Workflow

```
Author Manifest → Validate → Compile → Review → Institutional Acceptance → Deploy → Domain Readiness → Activation → Monitor → Supersede
```

See [docs/operations/service-pack-onboarding-guide.md](../docs/operations/service-pack-onboarding-guide.md) for the full implementation guide.

## Commands

```bash
npm run service-pack:validate -- service-packs/templates/*.pack.json
npm run service-pack:format -- service-packs/templates/01-simple-registration-service.pack.json
npm run service-pack:fingerprint -- service-packs/templates/01-simple-registration-service.pack.json
npm run service-pack:compile -- service-packs/templates/01-simple-registration-service.pack.json
npm run service-pack:diff -- before.pack.json after.pack.json
npm run service-pack:compare -- v1.pack.json v2.pack.json
npm run service-pack:deps -- service-packs/templates/01-simple-registration-service.pack.json
npm run service-pack:write-templates
```

## Governance invariants

- Service packs may only declare `DRAFT` maturity and non-operational public availability.
- Activation requires institutional acceptance and operational activation through `ServiceActivationService`.
- Authority function codes must be registered template references or institution-provisioned codes.
- High-risk diffs (removed evidence, changed decision actors, new external integrations, etc.) require institutional review and are never auto-approved.
