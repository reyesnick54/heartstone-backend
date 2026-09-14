# Production Readiness Operations

HeartStone operational procedures for Phase 13 production readiness.

## Key separation

- **CI green** proves engineering checks passed; it does not confer institutional acceptance.
- **Deployment** places artifacts in an environment; it does not activate institutional function.
- **Operational activation** requires a valid launch gate, accountable owner, monitoring, and suspension path.

## Activation checklist

1. Create `LaunchReadinessSnapshot` with exact release commit, artifact digest, and migration state.
2. Verify all acceptance dossiers (services, integrations, AI use cases) are current.
3. Evaluate launch gate with all mandatory requirements.
4. Record `OperationalActivationRecord` only after gate `PASSED`.
5. Start `StabilizationPeriod` with active `ProductionMonitoringPlan`.

## Rollback

Rollback may revert application release. It must not erase `GovernmentDecision`, official instruments, or audit history.

## Suspension

Use scoped `OperationalSuspension`. Preserve records, audit, and appeal/redress access. Do not unnecessarily suspend unrelated authorized services.

## Revalidation

Material changes (AI model, integration, security incident, authority change) require `OperationalRevalidation` before continued reliance.

## Retirement and exit

Retirement preserves official records. Decommissioning requires institutional `ExitAcceptanceRecord` — technical shutdown alone is insufficient.
