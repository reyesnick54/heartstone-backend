# Phase 4 — Authority & Policy Engine

## Objective

Evaluate whether a specific institutional actor may perform a specific action on a specific government function — without creating authority from authentication, identity, or technical access alone.

## Conceptual separation

| Layer | Question answered |
|---|---|
| **Identity** | WHO is the actor? |
| **Institutional structure** | WHERE do they sit? |
| **Appointment / Delegation** | What institutional relationships exist? |
| **Governing sources** | What is the recorded source basis? |
| **FunctionAuthorityRecord** | WHAT function is being evaluated? |
| **AuthorityAction** | WHAT are they trying to do? |
| **Conditions / dependencies** | WHAT else must be true? |
| **AuthorityEvaluationService** | WHETHER that specific action may proceed |

The evaluation result does not create authority. It evaluates recorded authority.

## Canonical module

All Phase 4 authority logic lives under `src/authority/`.

## Core models

- `FunctionAuthorityRecord` — controlled government function with classification and lifecycle
- `GoverningSource` — authenticated legal/policy source with version history
- `FunctionGoverningSource` — binds functions to sources
- `FunctionAuthorityAssignment` — institutional assignment to office/officeholder/institution
- `AuthorityActionRight` — permitted actions per function
- `AuthorityCondition` — evidence, qualification, limits, consultation boundaries
- `AuthorityDependency` — retained-national and professional dependencies
- `SegregationOfDutyRule` — SoD, self-approval, second-approval rules
- `AuthorityEvaluationRecord` — immutable evaluation audit trail
- `FunctionActivationAudit` — separate activation audit trail

## Eight classifications

1. `ABSEZ_OWNED`
2. `ABSEZ_DELEGATED`
3. `EXPRESSLY_RETAINED_NATIONAL`
4. `SHARED_OR_COORDINATED`
5. `RESERVED_PROFESSIONAL`
6. `ADMINISTRATIVE_SUPPORT`
7. `TECHNOLOGY_ASSISTED`
8. `PROHIBITED_OR_UNAUTHORIZED`

## Evaluation pipeline

1. Resolve institutional actor (`InstitutionalActorResolver`)
2. Validate function lifecycle and classification
3. Validate governing source authenticity and temporal validity
4. Validate appointment and delegation where required
5. Validate institutional assignment
6. Validate action right for requested action
7. Evaluate conditions, SoD rules, and dependencies
8. Persist immutable `AuthorityEvaluationRecord`
9. Return `ALLOW`, `DENY`, `REQUIRES_EXTERNAL_DETERMINATION`, or `SAFE_HALT`

## Safe halt

Unresolved governing source conflicts produce `SAFE_HALT`. The engine does not guess through conflicts.

## Activation control

`FunctionAuthorityRecord` cannot become `ACTIVE` through ordinary create/update endpoints. Activation is a separate audited operation requiring governing source linkage, assignment, and action rights.

## API surface (`/api/v1/authority/...`)

- `POST /authority/governing-sources`
- `PATCH /authority/governing-sources/:id/authenticate`
- `PATCH /authority/governing-sources/:id/revoke`
- `GET /authority/governing-sources`
- `POST /authority/functions`
- `PATCH /authority/functions/:id/activate`
- `PATCH /authority/functions/:id/suspend`
- `GET /authority/functions`
- `POST /authority/evaluate` (protected; server computes authority)
- `GET /authority/evaluate/records/:id`

## Security invariants

- Client-supplied `authorized=true` is never accepted
- OIDC roles do not confer authority
- MFA / login do not confer authority
- Service/AI identities cannot satisfy professional or final decision functions
- Evaluation records are append-only through the public API
- Governing source modification is not performed during evaluation
