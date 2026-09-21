# Service-Pack Examples

All manifests in this directory are **NON_PRODUCTION / TEMPLATE ONLY**.

They mirror the canonical templates in `../templates/` and exist for validation, diff, and onboarding exercises. Do not deploy these manifests without institutional review and governed import.

```bash
npm run service-pack:validate -- service-packs/examples/*.pack.json
npm run service-pack:compile -- service-packs/examples/01-simple-registration-service.pack.json
```
