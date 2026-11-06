# Citizen self-service routes

These routes let a signed-in citizen ask the government to do something or record a choice. None
of them decides anything. Each request goes into an existing governed domain (redress, record
correction, document custody, communications, healthcare consent), where an authorized official
or the domain's own rules act on it.

Controllers:

- `src/experience/citizen/self-service/citizen-self-service.controller.ts`
- `src/healthcare/consent/citizen/citizen-healthcare-consent.controller.ts`

Both are `AUTHENTICATED_SELF_SERVICE`.

## Rules every route follows

| Rule | How it is enforced |
| --- | --- |
| Acts only as the session identity | Services read `session.identityId`. Bodies have no identity, actor or patient fields; `forbidNonWhitelisted` rejects any that are sent, and `ClientIdentitySubstitutionGuard` rejects actor aliases. |
| Someone else's resource is "not found" | Ownership is part of the query (`applicantIdentityId`, `receivedFromIdentityId`, the session's patient references). A miss returns 404, never 403. |
| No authority, verification, approval or issuance | The routes call request-recording services only: `RedressMatterService.fileMatter`, `RecordCorrectionService.requestCorrection`, `DocumentVersionsService.uploadVersion`, `HealthcareConsentService`. |
| Audited | Each write records a `PROTECTED_ENDPOINT_ACCESS` security audit event (with ledger entry) with `metadata.action` set to the citizen action. Domain audit (document audit events, record-integrity events) is recorded as well. |
| Safe to retry | Duplicate review filings are refused under a transaction advisory lock. A repeated upload of the same bytes returns the first upload. Profile corrections accept an `idempotencyKey`. Mark-read is idempotent. Preference saves are idempotent. |

## Routes

All paths are under `/api/v1/experience/citizen`.

### Request for review (appeal) of a decision on your own case

- `GET cases/{caseId}/review-requests` returns the case's reviewable decisions, the review routes
  available for it, and the requests already filed.
- `POST cases/{caseId}/review-requests` with body `{ decisionId, routeCode, groundsStatement }`
  returns `201 CitizenReviewRequestDto`.

Rules:

- The case must be the citizen's (`applicantIdentityId`), and the decision must belong to that case.
- Only decisions in `FINALIZED`, `RECORDED`, `CONDITIONS_PRECEDENT_PENDING` or `EFFECTIVE` can be
  reviewed (`409 DECISION_NOT_REVIEWABLE` otherwise).
- The route must be a `GovernmentServiceRedressRoute` on the service version the case was opened
  under, with a currently effective `ACTIVE` route version (`404 REVIEW_ROUTE_NOT_AVAILABLE`
  otherwise). The citizen never picks a route version or a reviewer.
- A request is refused with `409 REVIEW_ALREADY_REQUESTED` while any review of the same decision
  by the same citizen is open (`ACTIVE_REDRESS_MATTER_STATUSES`). It is also refused if a
  non-withdrawn review already used the same route; further review goes to a different route.
  The check runs under `pg_advisory_xact_lock`, so a concurrent double submit cannot create two
  matters.
- Filing does not stay or reverse the decision. A stay applies only when the route version's
  `automaticStayOnFiling` is set, as `RedressMatterService` already enforces.
- The grounds text is stored verbatim in `decision_review_references.groundsStatement`.

### Profile correction request

- `GET profile/correction-requests` lists the citizen's own requests.
- `POST profile/correction-requests` with body
  `{ givenName?, familyName?, displayName?, reason, supportingDocumentIds?, idempotencyKey? }`
  returns `201 CitizenProfileCorrectionRequestDto`.

Rules:

- The request creates a `RecordCorrection` (`targetRecordType = 'Person'`, status `REQUESTED`).
  `proposedChanges` stores each field as `{ current, requested }`. The `Person` row is not
  written.
- The citizen must request at least one value that differs from the record
  (`400 NO_CHANGE_REQUESTED`). An account with no linked person returns
  `409 PERSON_RECORD_NOT_LINKED`.
- Supporting documents must be ones the citizen uploaded; otherwise the request returns 404.
- Approval keeps the existing rule: it needs an `ALLOW` authority evaluation. Implementing a
  `Person` correction is still refused by `RecordCorrectionService`, which supports no
  replacement-version strategy for `Person`. Applying an approved profile correction therefore
  needs a separate official workflow, which has not been built.

### Communication preferences

- `GET preferences/communications` returns one item for each of `EMAIL`, `SMS`, `PORTAL` and
  `POSTAL`. A channel with no saved preference shows the default (enabled, `isExplicit: false`).
- `PUT preferences/communications` with body
  `{ preferences: [{ channelType, isEnabled, locale?, accessibilityRequirements? }] }` saves the
  listed channels and leaves the others unchanged. Each channel may appear once.

Preferences are self-service and take effect immediately. They are stored as identity-scoped
`CommunicationPreference` rows (`institutionId = null`). `CommunicationDeliveryService` still
delivers mandatory notices whatever the preferences say.

### Document upload to your own application

`POST applications/{id}/documents` with body
`{ title, documentType, originalFilename, contentType, contentBase64 }` returns
`201 CitizenApplicationDocumentUploadDto`.

Rules:

- The application must be the citizen's. Uploads are accepted while the application is `DRAFT`.
  After submission they are accepted only while the case is `WAITING_APPLICANT`, which matches
  the corrections rule. Any other state returns `409 APPLICATION_CLOSED_FOR_UPLOADS`.
- Content types are limited to `application/pdf`, `image/png` and `image/jpeg`. Files may be at
  most 10 MB decoded (`413 UPLOAD_TOO_LARGE`). Uploads are also bounded by the deployment's
  `JSON_BODY_LIMIT`, which defaults to `100kb`. Raise it where citizens upload files.
- The file goes through the existing storage port and malware scan. It is recorded as
  `APPLICANT_UPLOAD` with `authenticityStatus = NOT_EVALUATED` and linked to the application as
  `SUPPORTING_EVIDENCE`. Upload never verifies a document; the response always reports the scan
  and authenticity status.
- Uploading the same bytes to the same application again returns the first upload with
  `duplicate: true`.

### Mark a message read

`POST messages/{id}/read` returns `200 { messageId, read, readAt }`.

This records a `READ_RECEIPT` on the citizen's portal delivery. Only a recipient may mark a
message read (`403 MESSAGE_NOT_ADDRESSED_TO_CITIZEN`). The route is idempotent. Reading is not
legal acknowledgment; `POST messages/{id}/acknowledge` remains the explicit acknowledgment route.

### Health consent

- `GET healthcare/consents` returns the citizen's grants and the purposes they can consent to,
  each with the consent version currently in effect.
- `POST healthcare/consents` with body
  `{ purposeCode, consentVersionCode, consentType, dataCategories?, recipientCodes?, expiresAt? }`
  returns `201`.
- `POST healthcare/consents/{grantId}/withdraw` with body `{ reasonSummary? }` returns `201`.

Rules:

- The patient is the session identity's `HealthcarePatientReference`; no route accepts a patient
  id. If no reference exists, granting returns `409 PATIENT_REFERENCE_NOT_ESTABLISHED`.
- Only `DATA_SHARING` and `TREATMENT` consents are self-service. Guardian and research consents
  have their own governed flows.
- `consentVersionCode` must be the version currently in effect (`409 CONSENT_VERSION_NOT_CURRENT`),
  so a citizen cannot consent to text they were not shown. Only one active grant is allowed per
  purpose (`409 CONSENT_ALREADY_ACTIVE`).
- Withdrawal goes through `HealthcareConsentService.withdrawConsentGrant`, which keeps the consent
  and grant history. Withdrawing someone else's grant returns 404. Withdrawing twice returns
  `409 CONSENT_ALREADY_WITHDRAWN`.
- Consent records permission only. It is not treatment authorization or a clinical determination.

## Not provided

- **Public-safety incident report submission** (`POST public-safety/reports`). No service creates
  incident reports today. Reports need a `PublicSafetyEngagement` with a jurisdiction and
  responsible department, and the routing rules that would derive those have not been
  configured or built.

## Schema

Migration `20261106120000_citizen_self_service_requests`. It is additive only.

- `record_corrections.proposedChanges JSONB NOT NULL DEFAULT '{}'`
- `record_corrections.idempotencyKey TEXT`, unique with `requestedBy`
- `decision_review_references.groundsStatement TEXT`
