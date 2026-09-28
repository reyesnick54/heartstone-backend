# Remediation S19 — Production integrations, reporting, and activation gates

## Objective

Replace operational stand-ins with production-grade provider boundaries for payments, email, SMS, and external integrations; compute government KPIs from source records; deliver institution-scoped Appendix G reporting; and enforce activation/suspension at runtime.

## Module location

```
src/remediation/s19/
  s19-integrations-reporting.module.ts
  providers/
  integrations/
  reporting/
  activation/
  observability/
```

`OperationalProvidersModule` is global and wires canonical ports used by `src/operational-support/`.

## Provider readiness

| Port | Test adapter (non-production) | Configured adapter |
| --- | --- | --- |
| Payment | `TestPaymentProviderAdapter` | `ConfiguredPaymentProviderAdapter` |
| Email | `TestEmailAdapter` | `HttpEmailProviderAdapter` |
| SMS | `TestSmsAdapter` | `HttpSmsProviderAdapter` |

Production startup fails closed when test adapters remain bound (`OperationalProvidersProductionGateService`). Leadership-selected providers use `OPERATIONAL_*_PROVIDER=configured` environment configuration; operational readiness remains **BLOCKED** until vault references and endpoints are present.

## Trust boundaries

- Payment success may satisfy fee requirements only.
- Messaging and integration success do not approve applications, issue licences, or record decisions.
- Webhook verification uses provider port signature validation with idempotent event handling (Phase 11).

## Reporting

- `ComputedMetricService` derives KPI values from canonical domain records.
- `MetricCalculationRunService` rejects client-submitted totals for non-manual metrics.
- `AppendixGReportService` produces reproducible institution/period reports from configured metric definitions.

## Activation

- `ServiceRuntimeGateService` blocks intake for suspended/inactive services and requires activation evidence in production.
- Issuance readiness includes `SERVICE_OPERATIONALLY_ACTIVE`.

## Observability

- `TraceCorrelationService` propagates correlation identifiers across components.
- `OperationalSecurityTelemetryService` records structured security events via `SecurityAuditService`.
