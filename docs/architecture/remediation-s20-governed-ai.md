# Remediation S20 — Governed AI control plane and runtime

## Objective

Complete HeartStone's governed AI architecture: distinct AI agent identity, model and agent registries, fail-closed policy gate, independent data-boundary enforcement, full call audit integrated with the S14 government audit ledger, human review controls, and a provider-neutral runtime boundary.

## Status layers (do not conflate)

| Layer | Meaning in S20 |
|---|---|
| **Architecture implemented** | Schema, services, policy gate, audit records, deterministic adapter, and API routes exist in `src/intelligence/ai/`. |
| **Provider approved** | Leadership has registered an `AiModelProviderRegistry` entry in `ACTIVE`/`APPROVED` status with sovereignty references. |
| **Agent approved** | `AiAgentIdentity` and `AiAgentDefinition` are `ACTIVE`/`APPROVED` with tool and data-class allowlists. |
| **Service activated** | `AI_EXTERNAL_PROVIDER_ENABLED=true` plus approved secret configuration — external adapters remain unavailable by default. |

## AI trust boundary

- AI agent identity (`AiAgentIdentity`) is separate from human `Identity`, service accounts, officeholders, and organizations.
- Technical tool allowlists do not create legal authority.
- `ConsequentialActionGuard` and `AiConsequentialDefenseService` block human-reserved actions (`APPROVE`, `SIGN`, `ISSUE`, `ENFORCE`, etc.).
- No AI output is delivered to end users unless registry, model approval, policy allow, audit record, and required human review are satisfied (`AiUserOutputGateService`).

## Canonical module

```
src/intelligence/ai/
  governed-ai.module.ts
  governed-ai.controller.ts
  config/governed-ai.config.ts
  ports/ai-model.port.ts
  adapters/deterministic-governed-ai.adapter.ts
  adapters/unavailable-external-ai.adapter.ts
  services/
```

Prisma models live under **Remediation S20** in `prisma/schema.prisma` (migration `20260928120000_remediation_s20_governed_ai`).

## Policy gate

`AiPolicyGateService` evaluates registered agent, agent identity, model, provider, suspensions, data class allowlist, and optional tool code. If permission cannot be established: **DENY**. Policy service unavailability throws and fails closed.

## Data governance

`AiDataBoundaryService` enforces agent data-class allowlists independently of the human caller's view rights. Leadership decisions are represented only via `dataPolicyReference` / governed configuration references — the runtime does not invent permitted data classes.

## Provider boundary

- Secrets belong in environment configuration (`AI_EXTERNAL_PROVIDER_SECRET_ENV_KEY`), not registry tables, logs, or agent records.
- Default runtime uses `DeterministicGovernedAiAdapter` (recommendatory, `isBinding: false`, `confidence: 0`).
- External invocation requires explicit `AI_EXTERNAL_PROVIDER_ENABLED` and production gate approval.

## Audit

Each allowed call creates `AiCallRecord` with input, sources, output hash, optional edits and review, and links to `GovernmentAuditLedgerEntry` (`eventType: AI_CALL`).

## Operational activation requirements (leadership)

Until institutionally approved and configured:

- Keep `AI_EXTERNAL_PROVIDER_ENABLED` unset/false.
- Register providers, models, and agents through institutional governance workflows (APIs expose runtime enforcement; institutional approval processes remain external).
- Define data-policy references and sovereignty requirements in registry metadata.

## Related documents

- [phase-12-intelligence-analytics-ai-command.md](./phase-12-intelligence-analytics-ai-command.md)
- [remediation-s14-audit-config-governance.md](./remediation-s14-audit-config-governance.md)
