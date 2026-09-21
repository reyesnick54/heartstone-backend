# Consequential Action Guard

## Purpose

The Consequential Action Guard is the canonical HeartStone enforcement point for government actions that can affect rights, obligations, official records, licenses, permits, approvals, enforcement, expenditure, or other consequential outcomes.

It integrates three separate layers that must never be conflated:

| Layer | Question |
|---|---|
| **Authentication** (`SessionAuthGuard`) | Who are you? |
| **Institutional scope** (`resourceResolver`) | May you access this resource? |
| **Authority** (`AuthorityEvaluationService`) | Are you institutionally authorized to perform THIS action on THIS function under THESE conditions? |

## Canonical module location

All guard logic lives under `src/authority/consequential-action/`.

## Applying the guard to a controller route

1. Import `AuthorityModule` in the feature module.
2. Apply guards in order: `@UseGuards(SessionAuthGuard, ConsequentialActionGuard)`.
3. Declare the action with `@ConsequentialAction({ ... })`.

```typescript
@Post('execute')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ConsequentialAction({
  action: AuthorityActionType.DECIDE,
  functionResolver: resolveFunctionFromDecisionTypeVersion,
  resourceResolver: resolveResourceFromCase,
  institutionalFieldPrefixes: ['decisionMaker'],
})
executeDecision(@CurrentSession() session: SessionContextDto, @Body() dto: ExecuteDto) {
  // Handler runs only after ALLOW; evaluation is on request.authorityEvaluation
}
```

## Metadata fields

| Field | Purpose |
|---|---|
| `action` | Required `AuthorityActionType` being attempted |
| `functionAuthorityRecordId` | Static function id when known at compile time |
| `functionCode` | Resolve function by canonical code |
| `functionResolver` | Resolve function id from request body/params |
| `resourceResolver` | Resolve institutional resource scope for alignment checks |
| `institutionalFieldPrefixes` | Body prefixes for officeholder/appointment fields |
| `requireHumanActor` | Fail closed for service/AI identities on final decisions (default: true for final-decision actions) |

## Reusable resolvers

Shared resolvers live in `src/authority/consequential-action/consequential-action-resolvers.ts`:

- `resolveFunctionFromDecisionTypeVersion`
- `resolveFunctionFromInstrumentTypeVersion`
- `resolveFunctionFromRedressMatter`
- `resolveFunctionFromComplianceReview`
- `resolveFunctionFromRouteParam`
- `resolveResourceFromCase`
- `resolveResourceFromRedressMatter`
- `resolveResourceFromComplianceReview`

## Programmatic use (non-HTTP services)

Inject `ConsequentialActionService` when a consequential operation is not exposed through a controller:

```typescript
await this.consequentialActionService.assertConsequentialActionAllowed(
  session,
  {
    action: AuthorityActionType.APPROVE,
    functionAuthorityRecordId: version.activationFunctionAuthorityRecordId,
  },
  { body: institutionalFields },
);
```

## Evaluation persistence

Every blocked or allowed evaluation persists an immutable `AuthorityEvaluationRecord` through `AuthorityEvaluationService.evaluate()`. On HTTP routes, the latest evaluation is attached to:

- `request.authorityEvaluation`
- `request.consequentialActionEvaluation`

Downstream services should store `evaluationId` on domain records where the schema provides `authorityEvaluationRecordId`.

## Fail-closed conditions

The guard fails closed (403 with audit-safe denial metadata) when:

- No function authority mapping can be resolved
- Authenticated session is missing
- Actor identity is unresolved or non-human for final decisions
- Appointment is missing, expired, suspended, or misaligned
- Delegation is missing, expired, revoked, or out of scope
- Institutional resource scope does not align with the authority function
- Conditions, dependencies, or SoD rules are unmet
- External determination is required but unresolved
- Authority function is suspended or inactive
- Governing source conflicts produce `SAFE_HALT`

Denial responses include machine-readable `outcome`, `status`, and `explanationCodes` without leaking restricted governing material.

## When NOT to use this guard

Do **not** apply `@ConsequentialAction` to:

- Applicant submissions and filing endpoints
- Read-only information access (`GET` routes)
- Draft preparation or AI-assisted drafting that is explicitly non-final
- Routes where no institutional authority decision is being attempted

## Initial integrations

| Domain | Routes / services |
|---|---|
| Decisions | `POST decisions/readiness/assess`, `POST decisions/execute` |
| Issuance | `POST decisions-issuance/readiness/assess`, `POST decisions-issuance/issue` |
| Redress | `POST redress/decisions`, `POST redress/interim-relief/decisions` |
| Compliance | `POST compliance/reviews/finalize` |
| Authority lifecycle | `PATCH authority/functions/:id/suspend` |
| Service activation | `ServiceActivationService.evaluateActivationAuthority()` |

## Legacy `@RequiresAuthority`

`@RequiresAuthority` and `AuthorityPolicyGuard` remain as deprecated adapters delegating to `ConsequentialActionService`. New routes must use `@ConsequentialAction`.
