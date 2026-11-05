# S21c — The acting officer is always the signed-in identity

## Problem

About twenty services (carbon, maritime, digital assets, cannabis, planning permits,
financial licences, refunds, fee schedules, reconciliation, continuity, decisions) evaluate
authority for an identity named in the request body, such as `issuerIdentityId` or
`approverIdentityId`. The identity-substitution guard only knew five field names, so a caller
could issue, approve or decide under another officer's authority. Redress decisions accepted a
body `reviewerIdentityId` and recorded it as the decider, while the guard had evaluated the
session user.

Separately, a monetary `TRANSACTION_LIMIT` condition treated a missing amount as 0, so leaving
the amount out passed any limit.

## Change

- `CLIENT_ADMIN_ACTOR_FIELD_ALIASES` now covers performer fields: issuer, issued-by, approver,
  approved-by, authoriser, authorised-by, authorising, decided-by, decision-maker, verifier,
  verified-by, executed-by, released-by, assessed-by, recorded-by, accepted-by, disposed-by,
  signed-by. A request naming anyone other than the session identity in these fields is refused
  with 403 on every route.
- Not included, by design: `reviewerIdentityId` (also used to assign a reviewer) and
  `segregatedApproverIdentityId` (must be a different person). Routes handle these explicitly.
- Redress decisions and interim-relief decisions record the session identity as reviewer and
  reject a different `reviewerIdentityId`.
- `TRANSACTION_LIMIT` fails closed with `TRANSACTION_AMOUNT_UNKNOWN` when the amount is missing,
  negative or not finite, and denies when the configured limit is not a number.

## Follow-up

Where a route has a monetary limit, the amount should be derived on the server from the record
(fee assessment, refund, invoice) rather than supplied by the caller.
