# Service Pack Governance and Institutional Acceptance

HeartStone Government Service Packs must pass **technical validation**, **institutional review**, and **consequential acceptance** before deployment. None of these stages are interchangeable.

## Separation of concerns

| Stage | Meaning | Does not imply |
| --- | --- | --- |
| Technical validation | Manifest schema, dependency references, and compilation integrity | Institutional acceptance, deployment, or activation |
| Institutional review | Structured multi-party review with findings | Legal authority creation or acceptance |
| Legal/policy verification | Authority-basis and governing-source review under authority controls | Automatic authentication of governing sources from reviewer comments |
| Institutional acceptance | Consequential approval recorded with authority evaluation | Acceptance of future versions |
| Deployment | Configuration binding into platform domains | Operational activation of services |
| Operational activation | Governed service activation via domain services | Retroactive validation or review |

## Lifecycle

```
DRAFT
  → VALIDATED (technical)
  → PENDING_REVIEW / IN_REVIEW (governance)
  → REVISION_REQUIRED | PENDING_ACCEPTANCE
  → INSTITUTIONALLY_ACCEPTED
  → DEPLOYMENT_READY (deployment domain)
```

Rejection and withdrawal are terminal for deployment/activation until a new version is introduced.

## Configurable review chain

Review requirements are defined per institution (and optionally per service pack) using:

- `ServicePackReviewChainPolicy`
- `ServicePackReviewChainStep`

Supported review types include technical architecture, service-owner, departmental, authority/legal-basis, cybersecurity, privacy/data-governance, integration, operational-readiness, and executive/institutional acceptance when configured.

Jurisdictions are not required to share the same sequence or review set.

## Core records

| Record | Purpose |
| --- | --- |
| `ServicePackReview` | Formal review instance for a version |
| `ServicePackReviewAssignment` | Reviewer assignment (access ≠ acceptance authority) |
| `ServicePackReviewFinding` | Structured finding with severity, category, resolver, and evidence |
| `ServicePackReviewComment` | Review commentary (does not create authority) |
| `ServicePackReviewEvidence` | Linked records/evidence references |
| `ServicePackReviewSignoff` | Reviewer sign-off outcome |
| `ServicePackAcceptanceRecord` | Institutional acceptance with fingerprint and authority evaluation reference |
| `ServicePackRejectionRecord` | Rejection with reason |
| `ServicePackRevisionRequest` | Required revision after review |
| `ServicePackGovernanceAuditRecord` | Immutable audit trail for governance events |

## Acceptance invariants

- Acceptance is recorded per `ServicePackVersion` with a **version fingerprint** derived from compilation and manifest checksum material.
- Acceptance of version *n* does **not** accept version *n+1*.
- Material fingerprint change **invalidates** prior acceptance records for that version.
- Blocking findings prevent acceptance until resolved, dismissed, or explicitly accepted as risk.
- Institutional acceptance uses **canonical `ActorContext`** and `@ConsequentialAction` (`APPROVE`) with authority evaluation — client-supplied identity fields are rejected.

## API surface (governance)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/service-packs/:id/reviews` | List reviews |
| POST | `/service-packs/:id/reviews` | Bootstrap configured reviews for a validated version |
| POST | `/service-packs/:id/reviews/:reviewId/findings` | Add structured finding |
| POST | `/service-packs/:id/reviews/:reviewId/request-revision` | Request revision |
| POST | `/service-packs/:id/reviews/:reviewId/resolve-finding` | Resolve finding |
| POST | `/service-packs/:id/submit-for-acceptance` | Submit after required reviews |
| POST | `/service-packs/:id/accept` | Consequential institutional acceptance |
| POST | `/service-packs/:id/reject` | Reject version |

## Deployment integration

`ServicePackDeploymentService` requires an **active** `ServicePackAcceptanceRecord` matching the current version fingerprint before marking deployment-ready, deploying, or staging activation.

## Audit

All review, finding, acceptance, rejection, revision, and invalidation events are written to `ServicePackGovernanceAuditRecord`.
