# Service-Pack Tooling

Implementation lives in:

- `src/service-catalog/service-packs/` — TypeScript library (validate, format, fingerprint, diff, reports)
- `scripts/service-pack-cli.ts` — CLI entrypoint wired through npm scripts

Run `npm run service-pack:write-templates` to regenerate canonical template and example JSON files from `canonical-templates.ts`.
