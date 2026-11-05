# API error codes

Some error responses carry a stable `code` so clients do not have to match message text. Status
codes and messages are unchanged; `code` is added alongside them. Branch on `code`. Messages may be
reworded or translated.

```json
{
  "statusCode": 401,
  "message": "Recent stronger authentication is required",
  "error": "Unauthorized",
  "code": "STEP_UP_REQUIRED"
}
```

Responses that pass through the global filter as a standard body also carry `path` and
`timestamp`. Authority denials keep their own fields (`outcome`, `status`, `explanationCodes`,
`safeHalt`, and so on) and add `code` when it applies.

## Codes

| Code | Status | Meaning | What the client should do |
| --- | --- | --- | --- |
| `STEP_UP_REQUIRED` | 401 | The session's sign-in is older than the route allows. | Send the user through sign-in again (OIDC `prompt=login` or `max_age`), then retry. |
| `MFA_REQUIRED` | 401 | The route needs a session signed in with multi-factor authentication. | Sign in again requesting MFA (for example an `acr_values` that requires it), then retry. |
| `ASSURANCE_INSUFFICIENT` | 401 | The session's assurance level is below the route's minimum. | Sign in again at a higher level. |
| `SAFE_HALT` | 403 or 400 | Processing was stopped on purpose because a required control could not be established. | Do not retry automatically. Show that the action is paused pending institutional review. |

A 401 without one of these codes still means the session is missing, invalid or expired.

### Where `SAFE_HALT` comes from

- Authority evaluation denials whose evaluation set `safeHalt: true` (403).
- Safe-halted case workflows (403).
- Route access guard: a route with no access classification, or a non-human identity on a
  restricted or consequential mutation (403).
- AI actors attempting to override an active safe halt (403).
- Record disposition authorisation while safe-halt conditions remain (400).
- Resolving a material source discrepancy that is in `SAFE_HALTED` status (400).

Other authority denials (`safeHalt: false`) have no `code`; read `explanationCodes` for the reason.

## Rules for the filter

`AllExceptionsFilter` keeps a `code` only when:

- it comes from an `HttpException` payload. Codes on other errors, such as database driver codes,
  are never returned;
- it looks like an identifier (uppercase letters, digits and underscores, up to 64 characters).
  Anything else is dropped;
- for 5xx responses in production, it is listed above. Other codes on 5xx are dropped, and the
  message is replaced with `Internal server error` as before.

Domain modules that already return their own `code` or `reasonCode` values (AI governance,
healthcare, actor binding) keep them. This page lists the cross-cutting codes every client should
handle.

## Adding a code

1. Add it to `API_ERROR_CODES` in `src/common/errors/api-error-codes.ts`.
2. Throw with `codedErrorBody(status, message, code)` so the body keeps Nest's shape.
3. Add a unit test for the thrower and a row to the table above.
