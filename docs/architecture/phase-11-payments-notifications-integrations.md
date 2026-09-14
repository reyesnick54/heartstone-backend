# Phase 11 — Payments, Notifications & Government Integrations

## Objective

Provide operational support for fee administration, payment processing, institutional communications, and government system integrations — without conflating financial settlement, message delivery, or data exchange with legal authority, government decisions, or case disposition.

Phase 11 lives under `src/operational-support/` and adds Prisma models in migration `20260914112037_phase_11_financial_communications_integrations`.

## Critical rule

HeartStone may:

- calculate and record fee obligations
- issue invoices and process payments
- deliver institutional communications
- coordinate authenticated integration exchanges
- index operational records to the Master Administrative File
- implement authorized refunds where a separate remedy authorizes them

It must not pretend that:

- payment settles a case or records a government decision
- a receipt constitutes an official decision or instrument
- message delivery creates legal notice effectiveness by itself
- integration connectivity or exchange success substitutes for institutional acceptance or authoritative determination
- external registry data automatically overwrites local records without discrepancy handling

## Conceptual separation

| Layer | Question answered | Does NOT mean |
|---|---|---|
| **FeeSchedule / FeeScheduleVersion** | What tariff applies? | Payment received |
| **FeeAssessment** | What obligation was calculated for a case/application? | Approval or case disposition |
| **Invoice** | What amount is due and payable? | Application approved |
| **PaymentIntent** | What payment is being attempted? | Case status change |
| **PaymentTransaction / PaymentReceipt** | What settlement occurred? | GovernmentDecision recorded |
| **FinancialApprovalRecord** | What operational finance action was authorized? | Legal or institutional decision |
| **CommunicationTemplate** | What approved wording/channel applies? | Official decision notice issued |
| **CommunicationMessage** | What institutional message was composed and approved? | Legal notice effectiveness |
| **CommunicationDelivery** | What transport attempt occurred? | Recipient legally bound |
| **CommunicationReceipt** | What acknowledgment evidence exists? | Automatic approval of underlying action |
| **IntegrationDefinition** | What external system is configured? | Production-ready integration |
| **IntegrationAcceptanceRecord** | What acceptance milestone was assessed? | Legal authority to decide |
| **IntegrationExchange** | What authenticated exchange occurred? | Authoritative determination |
| **RegistryQuery** | What external data was retrieved? | Automatic local record mutation |
| **SourceDiscrepancy** | Where do local and external values diverge? | Resolved institutional truth |

## Canonical module

All Phase 11 logic lives under `src/operational-support/`:

```
src/operational-support/
  operational-support.module.ts
  operational-support.controller.ts
  operational-support.constants.ts
  operational-support-schema.constants.ts
  common/
    operational-support-boundary.service.ts
  financial/
    fee-schedule.service.ts
    fee-assessment.service.ts
    invoice.service.ts
    payment-intent.service.ts
    payment-transaction.service.ts
    payment-webhook.service.ts
    refund.service.ts
    refund-authorization.service.ts
    reconciliation.service.ts
    financial-approval.service.ts
    adapters/test-payment-provider.adapter.ts
  communications/
    communication-template.service.ts
    communication-message.service.ts
    communication-delivery.service.ts
    adapters/test-email.adapter.ts
    adapters/test-sms.adapter.ts
  integrations/
    integration-definition.service.ts
    integration-gateway.service.ts
    integration-webhook.service.ts
    integration-acceptance.service.ts
    integration-outage.service.ts
    registry-query.service.ts
    source-discrepancy.service.ts
    redress-refund-bridge.service.ts
    adapters/test-registry.adapter.ts
  maf/
    maf-indexing.service.ts
```

---

## Domain 1 — Financial Administration

Phase 11A–C covers fee schedules, assessments, invoices, payments, refunds, reconciliation, disputes, and arrears.

### Sub-phases

| Slice | Scope |
|---|---|
| **11A** | Fee schedules, assessments, invoices |
| **11B** | Payment intents, transactions, provider webhooks, receipts |
| **11C** | Adjustments, refunds, reconciliation, disputes, arrears, financial approvals |

### Financial models

| Model | Purpose |
|---|---|
| `FeeSchedule` | Institution tariff identity, optionally linked to `GovernmentService` |
| `FeeScheduleVersion` | Versioned schedule with approval metadata |
| `FeeScheduleItem` | Line items with fixed or variable amounts |
| `FeeAssessment` | Calculated obligation for a case/application/MAF |
| `Invoice` | Issued payment demand linked to assessment and MAF |
| `InvoiceLine` | Invoice line items, optionally tied to schedule items |
| `PaymentChannelDefinition` | Supported payment channel catalog |
| `PaymentProviderConfiguration` | Institution/provider configuration (vault-backed secrets) |
| `PaymentIntent` | Attempt to pay an invoice |
| `PaymentTransaction` | Provider settlement record |
| `PaymentAllocation` | Allocation of settled funds to invoice lines |
| `PaymentReceipt` | Receipt artifact with content hash |
| `PaymentProviderWebhookEvent` | Idempotent provider webhook audit trail |
| `FeeAdjustmentRequest` / `FeeAdjustmentDecision` | Fee adjustment workflow |
| `RefundRequest` / `RefundAuthorization` / `RefundTransaction` | Segregated refund lifecycle |
| `ReconciliationBatch` / `ReconciliationItem` | Financial reconciliation control |
| `FinancialDispute` | Invoice/transaction dispute record |
| `ArrearsRecord` | Outstanding balance tracking |
| `FinancialApprovalRecord` | Operational finance approvals (schedule activation, waiver, refund, reconciliation closure, arrears action) |

### Financial enums

| Enum | Values |
|---|---|
| `FeeScheduleStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `SUPERSEDED`, `RETIRED` |
| `FeeAssessmentStatus` | `CALCULATED`, `INVOICED`, `WAIVED`, `ADJUSTED`, `SUPERSEDED` |
| `InvoiceStatus` | `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`, `WRITTEN_OFF` |
| `FinancialApprovalType` | `FEE_SCHEDULE_ACTIVATION`, `FEE_WAIVER`, `FEE_ADJUSTMENT`, `REFUND_AUTHORIZATION`, `RECONCILIATION_CLOSURE`, `ARREARS_ACTION` |
| `FinancialApprovalStatus` | `PENDING`, `APPROVED`, `REJECTED`, `SUPERSEDED` |
| `FeeAdjustmentDecisionOutcome` | `APPROVED`, `PARTIALLY_APPROVED`, `REJECTED` |
| `PaymentChannelType` | `CARD`, `BANK_TRANSFER`, `CASH_COUNTER`, `GOVERNMENT_TREASURY`, `MOBILE_WALLET`, `OTHER` |
| `PaymentIntentStatus` | `CREATED`, `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED` |
| `PaymentTransactionStatus` | `PENDING`, `AUTHORIZED`, `SETTLED`, `FAILED`, `REVERSED`, `CHARGEBACK` |
| `PaymentWebhookProcessingStatus` | `RECEIVED`, `AUTHENTICATED`, `PROCESSED`, `DUPLICATE`, `REJECTED`, `FAILED` |
| `FeeAdjustmentRequestStatus` | `PENDING`, `DECIDED`, `WITHDRAWN` |
| `RefundRequestStatus` | `PENDING`, `AUTHORIZED`, `PROCESSING`, `COMPLETED`, `REJECTED`, `FAILED` |
| `RefundTransactionStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `ReconciliationBatchStatus` | `OPEN`, `IN_PROGRESS`, `EXCEPTION`, `CLOSED` |
| `ReconciliationItemStatus` | `MATCHED`, `MISMATCH`, `EXCEPTION`, `RESOLVED` |
| `FinancialDisputeStatus` | `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `ESCALATED` |
| `ArrearsRecordStatus` | `OUTSTANDING`, `PARTIALLY_PAID`, `PAID`, `WRITTEN_OFF`, `DISPUTED` |

### Financial lifecycles

**Fee schedule activation**

`DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `ACTIVE`

Requires `FinancialApprovalRecord` with `FEE_SCHEDULE_ACTIVATION` and Phase 4 authority evaluation.

**Assessment to invoice**

`FeeAssessment` (`CALCULATED`) → `Invoice` (`DRAFT` → `ISSUED`) → `PaymentIntent` → `PaymentTransaction` (`SETTLED`)

Issued invoice totals are immutable. Client-supplied totals, statuses, and approval metadata are rejected.

**Payment settlement**

Provider webhook or internal settlement path:

1. Authenticate webhook signature
2. Enforce idempotency on `externalEventId`
3. Match amount and currency to `PaymentIntent`
4. Create or reuse `PaymentTransaction`
5. Issue `PaymentReceipt` with `PHASE_11B_BOUNDARY_DISCLAIMER`
6. Update invoice `amountPaidCents` and status only — never case or decision state

**Refund**

`RefundRequest` (`PENDING`) → authority-evaluated `RefundAuthorization` → `RefundTransaction`

Authorizer must differ from requester. Refund amount cannot exceed settled minus prior refunds.

---

## Domain 2 — Communications & Notifications

Phase 11D covers templates, messages, delivery, receipts, preferences, mandatory rules, translation, and accessibility.

### Communications models

| Model | Purpose |
|---|---|
| `CommunicationTemplate` | Stable template identity by channel |
| `CommunicationTemplateVersion` | Versioned subject/body templates with approval lifecycle |
| `CommunicationMessage` | Institutional message linked to case/MAF; optional `decisionNoticeReference` |
| `CommunicationRecipient` | Per-recipient addressing metadata |
| `CommunicationDelivery` | Per-recipient transport attempt |
| `CommunicationDeliveryAttempt` | Attempt history with provider reference |
| `CommunicationReceipt` | Delivery/read/legal acknowledgment evidence |
| `CommunicationPreference` | Recipient channel opt-in/out |
| `MandatoryCommunicationRule` | Rules that override preferences for required notices |
| `TranslationRecord` | Attributed translation audit |
| `AccessibilityAccommodation` | Recipient accessibility configuration |

### Communications enums

| Enum | Values |
|---|---|
| `CommunicationTemplateStatus` | `DRAFT`, `APPROVED`, `ACTIVE`, `SUPERSEDED`, `RETIRED` |
| `CommunicationChannelType` | `EMAIL`, `SMS`, `PORTAL`, `POSTAL`, `IN_PERSON`, `GOVERNMENT_SECURE_MESSAGING`, `OTHER` |
| `CommunicationMessageStatus` | `DRAFT`, `APPROVED`, `QUEUED`, `DELIVERING`, `DELIVERED`, `PARTIALLY_DELIVERED`, `FAILED`, `CANCELLED` |
| `CommunicationDeliveryStatus` | `PENDING`, `IN_PROGRESS`, `DELIVERED`, `FAILED`, `BOUNCED`, `SUPERSEDED` |
| `CommunicationReceiptType` | `DELIVERY_CONFIRMATION`, `READ_RECEIPT`, `LEGAL_ACKNOWLEDGMENT`, `SIGNATURE_CAPTURE` |
| `MandatoryCommunicationRuleStatus` | `ACTIVE`, `INACTIVE` |

### Communications lifecycles

**Template**

`DRAFT` → `APPROVED` → `ACTIVE` (prior active versions `SUPERSEDED`)

Template content is scanned for injection patterns (`<script>`, `javascript:`, unbalanced `{{ }}`, etc.). Variable names must match `^[a-zA-Z][a-zA-Z0-9_.]*$`.

**Message**

`DRAFT` → `APPROVED` → `DELIVERING` → `DELIVERED` / `PARTIALLY_DELIVERED` / `FAILED`

Only `APPROVED` or `QUEUED` messages may be delivered. Messages may reference approved/active template versions only.

**Delivery**

For each recipient:

1. Check `CommunicationPreference` unless `MandatoryCommunicationRule` is active
2. Attempt primary channel via registered adapter
3. On failure, try alternate channel from `ALTERNATE_CHANNEL_MAP` (e.g. EMAIL ↔ SMS)
4. For mandatory delivery, supersede failed primary attempt and force alternate channel
5. Record `CommunicationDeliveryAttempt` and optional `CommunicationReceipt`

`decisionNoticeReference` links a message to a Phase 8 decision notice artifact; the link is referential only and does not create the notice or decision.

---

## Domain 3 — Government Integrations

Phase 11E covers integration definitions, acceptance, authenticated exchanges, webhooks, registry queries, source authority, discrepancies, outages, and dead-letter handling.

### Integrations models

| Model | Purpose |
|---|---|
| `TechnologyDependency` | External system dependency catalog |
| `IntegrationDefinition` | Institution integration identity |
| `IntegrationVersion` | Versioned integration specification |
| `IntegrationEndpoint` | Registered URL templates with direction and auth method |
| `DataExchangeContract` / `DataExchangeField` | Schema contract and field mapping |
| `AuthoritativeSourceDesignation` | Which external sources are authoritative for which fields |
| `FieldAuthorityMapping` | Field-to-source authority binding |
| `IntegrationCredentialReference` | Vault reference for integration secrets |
| `IntegrationAcceptanceRecord` | Acceptance dossier milestones |
| `IntegrationRequest` / `IntegrationExchange` / `IntegrationMessage` | Request/exchange/message audit trail |
| `IntegrationWebhookEvent` | Inbound integration webhook with idempotent processing |
| `IntegrationDataTransformation` | Transformation audit |
| `IntegrationValidationResult` | Exchange validation outcome |
| `ExternalRecordReference` | Cross-system record linkage |
| `RegistryQuery` / `RegistrySynchronization` | Registry lookup and sync result |
| `SourceDiscrepancy` / `SourceDiscrepancyResolution` | Local vs external value divergence |
| `IntegrationReconciliationRecord` | Integration-level reconciliation period |
| `IntegrationDeadLetterRecord` | Failed message retention |
| `IntegrationOutage` / `IntegrationFallbackActivation` / `IntegrationRecoveryEvent` | Outage, fallback, and recovery control |

### Integrations enums

| Enum | Values |
|---|---|
| `IntegrationAcceptanceStatus` | `TECHNICALLY_CONNECTED`, `TESTED`, `TECHNICALLY_READY`, `INSTITUTIONALLY_ACCEPTED`, `OPERATIONALLY_ACTIVE`, `SUSPENDED`, `REVALIDATION_REQUIRED` |
| `IntegrationDefinitionStatus` | `DRAFT`, `PENDING_ACCEPTANCE`, `ACCEPTED`, `ACTIVE`, `SUSPENDED`, `RETIRED` |
| `IntegrationEndpointDirection` | `INBOUND`, `OUTBOUND`, `BIDIRECTIONAL` |
| `DataExchangeFieldDirection` | `INBOUND`, `OUTBOUND`, `BIDIRECTIONAL` |
| `AuthoritativeSourceStatus` | `AUTHORITATIVE`, `SUPPORTING`, `MODELED`, `UNVERIFIED`, `STALE` |
| `IntegrationRequestStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `SAFE_HALTED`, `CANCELLED` |
| `IntegrationExchangeStatus` | `INITIATED`, `SENT`, `ACKNOWLEDGED`, `COMPLETED`, `FAILED`, `SAFE_HALTED` |
| `IntegrationMessageDirection` | `INBOUND`, `OUTBOUND` |
| `IntegrationWebhookProcessingStatus` | `RECEIVED`, `AUTHENTICATED`, `PROCESSED`, `DUPLICATE`, `REJECTED`, `FAILED` |
| `SourceDiscrepancyStatus` | `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `SAFE_HALTED` |
| `IntegrationOutageStatus` | `DETECTED`, `CONFIRMED`, `RECOVERING`, `RESOLVED` |
| `IntegrationFallbackStatus` | `ACTIVATED`, `IN_USE`, `RECONCILING`, `DEACTIVATED` |
| `IntegrationReconciliationStatus` | `OPEN`, `IN_PROGRESS`, `EXCEPTION`, `CLOSED` |
| `RegistryQueryStatus` | `PENDING`, `COMPLETED`, `FAILED`, `TIMEOUT`, `SAFE_HALTED` |
| `RegistrySynchronizationResult` | `SUCCESS`, `PARTIAL`, `FAILED` |

### Integration lifecycles

**Outbound exchange**

`IntegrationRequest` (`IN_PROGRESS`) → `IntegrationExchange` (`INITIATED` → `COMPLETED`) with hashed `IntegrationMessage`

Blocked when:

- confirmed outage with active fallback (no fabricated live responses)
- circuit breaker open after `CIRCUIT_BREAKER_FAILURE_THRESHOLD` consecutive failures
- resolved URL fails SSRF checks against registered endpoint host/protocol
- payload exceeds `DEFAULT_INTEGRATION_MAX_PAYLOAD_BYTES`

**Inbound webhook**

`RECEIVED` → signature verified → `AUTHENTICATED` → `PROCESSED` (or `DUPLICATE` on replay)

**Registry query**

`PENDING` → adapter query + schema validation → `COMPLETED` / `FAILED` / `SAFE_HALTED`

Completed queries record `RegistrySynchronization`; they do not automatically mutate case, decision, or MAF records.

**Source discrepancy**

Material discrepancies enter `SAFE_HALTED` and require institutional review before resolution.

---

## Boundary invariants

Phase 11 enforces 18 architectural boundaries. These are non-negotiable distinctions between operational support and consequential government action.

| # | Invariant | Enforcement |
|---|---|---|
| 1 | **Fee != Payment** | `FeeSchedule` / `FeeAssessment` record obligations; `PaymentTransaction` records settlement. Assessment creation does not imply payment received. |
| 2 | **Fee assessment != invoice approval** | `Invoice` issuance creates a payable demand from a `CALCULATED` assessment; it does not approve the underlying application or case. |
| 3 | **Payment obligation != application approval** | `PHASE_11A_BOUNDARY_DISCLAIMER`; invoice/assessment presence must not be interpreted as case disposition. |
| 4 | **Payment != approval** | `PAYMENT_NOT_APPROVAL`; `OperationalSupportBoundaryService.assertPaymentDoesNotConstituteApproval()`. |
| 5 | **Payment success != GovernmentDecision outcome** | `PAYMENT_DOES_NOT_ALTER_DECISION`; `PHASE_11B_BOUNDARY_DISCLAIMER`. |
| 6 | **Payment != case status mutation** | `PAYMENT_DOES_NOT_ALTER_CASE`; `rejectPaymentSideEffects()` blocks `caseStatus`, `decisionStatus`, `governmentDecisionId`, `outcome`, `approvalStatus`. |
| 7 | **Receipt != government decision** | `RECEIPT_NOT_DECISION`; receipts carry `PHASE_11B_BOUNDARY_DISCLAIMER`. |
| 8 | **Financial approval != government decision** | `FinancialApprovalRecord` governs operational finance only (schedule activation, waiver, refund, reconciliation closure). |
| 9 | **Client totals != server authority** | `CLIENT_TOTALS_FORBIDDEN`; clients cannot set amounts, statuses, or approval timestamps on financial records. |
| 10 | **Refund authorization != redress determination** | `RedressRefundBridgeService` applies only to `REFUND_IF_AUTHORIZED` remedies on pending implementation actions; it does not create redress outcomes. |
| 11 | **Reconciliation closure != case disposition** | Batch closure requires finance authority evaluation; it closes a reconciliation period, not an administrative matter. |
| 12 | **Communication template != official decision notice** | Templates are drafting/rendering artifacts; `decisionNoticeReference` is referential only. |
| 13 | **Message delivery != legal notice effectiveness** | `CommunicationDelivery` records transport; legal effect depends on separate institutional process and instrument/decision context. |
| 14 | **Delivery confirmation != legal acknowledgment** | `CommunicationReceiptType` distinguishes `DELIVERY_CONFIRMATION`, `READ_RECEIPT`, `LEGAL_ACKNOWLEDGMENT`, and `SIGNATURE_CAPTURE`. |
| 15 | **Mandatory communication != automatic approval** | `MandatoryCommunicationRule` overrides channel preference for delivery obligation only; it does not approve the underlying action. |
| 16 | **Technical connection != institutional acceptance != operational active** | `IntegrationAcceptanceStatus` progresses sequentially; `IntegrationDefinitionStatus` is derived from acceptance milestones. |
| 17 | **Integration exchange != authoritative determination** | `IntegrationExchange` coordinates authenticated data movement; it does not decide cases or issue instruments. |
| 18 | **External record reference != local truth** | `AuthoritativeSourceDesignation`, `SourceDiscrepancy`, and `SAFE_HALTED` material discrepancies preserve explicit divergence; registry results do not silently overwrite local records. |

Cross-cutting (Phase 4): **Access != Authority**. Session authentication and case visibility do not substitute for `AuthorityEvaluationService` on fee schedule activation, refund authorization, or reconciliation closure.

---

## IntegrationAcceptanceService

`IntegrationAcceptanceService` maintains the integration acceptance dossier and maps acceptance milestones to `IntegrationDefinitionStatus`.

### Acceptance statuses

| Status | Meaning |
|---|---|
| `TECHNICALLY_CONNECTED` | Basic connectivity established |
| `TESTED` | Test exchanges completed |
| `TECHNICALLY_READY` | Technical readiness assessed |
| `INSTITUTIONALLY_ACCEPTED` | Institutional sign-off recorded |
| `OPERATIONALLY_ACTIVE` | Approved for production exchanges |
| `SUSPENDED` | Production use suspended |
| `REVALIDATION_REQUIRED` | Acceptance must be re-established |

### Progression rules

1. **Initial state** — first progressive record must be `TECHNICALLY_CONNECTED`. Higher states cannot be established without a prior dossier.
2. **Sequential advancement** — progressive statuses must advance one step at a time: `TECHNICALLY_CONNECTED` → `TESTED` → `TECHNICALLY_READY` → `INSTITUTIONALLY_ACCEPTED` → `OPERATIONALLY_ACTIVE`.
3. **No regression via progressive path** — a requested status with order less than or equal to the current progressive status is rejected.
4. **Exception states** — `SUSPENDED` and `REVALIDATION_REQUIRED` may be recorded at any time without sequential constraint.
5. **Current status derivation** — `deriveCurrentStatus()` returns the highest progressive status reached; if no progressive records exist, the latest record status is used.
6. **Definition status mapping**:
   - `TECHNICALLY_CONNECTED`, `TESTED`, `TECHNICALLY_READY`, `REVALIDATION_REQUIRED` → `PENDING_ACCEPTANCE`
   - `INSTITUTIONALLY_ACCEPTED` → `ACCEPTED`
   - `OPERATIONALLY_ACTIVE` → `ACTIVE`
   - `SUSPENDED` → `SUSPENDED`

`getAcceptanceDossier(integrationDefinitionId)` returns `{ currentStatus, records }` ordered by `assessedAt`.

---

## Security controls

### Webhook authentication

**Payment webhooks** (`PaymentWebhookService`):

- Provider signature verified via `PaymentProviderPort.verifyWebhookSignature()`
- Invalid signatures recorded as `REJECTED` events; request fails with `WEBHOOK_SIGNATURE_INVALID`
- PAN/CVV/track data rejected from payload (`PAN_CVV_STORAGE_FORBIDDEN`)
- Amount and currency must match `PaymentIntent`
- Idempotency on `(paymentProviderConfigurationId, externalEventId)`; replays after `PROCESSED` return `DUPLICATE`

**Integration webhooks** (`IntegrationWebhookService`):

- HMAC-SHA256 signature: `sha256(secret:payload)` compared with `timingSafeEqual`
- Credential loaded from `IntegrationCredentialReference.vaultReference`
- Duplicate `externalEventId` returns existing event or marks `DUPLICATE`

### SSRF prevention

**Endpoint registration** (`IntegrationDefinitionService.assertUrlTemplateSafe`):

- Absolute `http`/`https` URLs only
- Loopback, link-local, and private-network hostnames rejected at registration

**Runtime resolution** (`IntegrationGatewayService.assertUrlMatchesEndpoint`):

- Resolved URL protocol and host must match registered `IntegrationEndpoint` template host
- Private/loopback resolved hostnames rejected even if template substitution is attempted

### Idempotency

| Surface | Key | Behavior |
|---|---|---|
| Payment webhook | `paymentProviderConfigurationId` + `externalEventId` | Settled replays return existing transaction |
| Payment transaction | `paymentProviderConfigurationId` + `providerTransactionReference` | Upsert to `SETTLED` |
| Integration webhook | `integrationDefinitionId` + `externalEventId` | Duplicate processed events marked `DUPLICATE` |

### Payload and timeout limits

- `DEFAULT_INTEGRATION_MAX_PAYLOAD_BYTES` = 1,048,576
- `DEFAULT_INTEGRATION_REQUEST_TIMEOUT_MS` = 30,000
- Registry responses validated through `assertRegistryResponseSchema()`

### Template injection prevention

`CommunicationTemplateService` rejects:

- Triple-brace patterns, `<script>`, `javascript:`, `onerror=`, `<iframe>`
- Unbalanced `{{` / `}}` placeholders
- Unsafe template variable names or values

### Segregation of duties

- Refund authorizer must differ from requester (`REFUND_SEGREGATION_REQUIRED`)
- Fee schedule activation, refund authorization, and reconciliation closure require Phase 4 `AuthorityEvaluationService` with explicit `ALLOW`

### Outage and circuit breaker

- `CIRCUIT_BREAKER_FAILURE_THRESHOLD` = 5 failures opens circuit and records outage
- `CIRCUIT_BREAKER_RECOVERY_PROBE_LIMIT` = 3 successes required to close circuit
- Confirmed outage with `IN_USE` fallback blocks live exchanges; fabricated responses are forbidden
- `safeHaltPendingRequests()` marks in-flight requests `SAFE_HALTED`

### Forbidden client fields

Server-authoritative fields rejected at boundary:

- Fee schedule: `status`, `approvedAt`, `approvedByIdentityId`, `effectiveFrom`, `effectiveUntil`
- Fee assessment / invoice / payment intent / transaction / refund: totals, statuses, timestamps
- Financial approval: `status`, `approvedAt`, `approvedByIdentityId`, `rejectionReason`
- Issued invoice: `totalAmountCents`, `currency`, `lines` are immutable

---

## Phase integrations

### Phase 4 — Authority & Policy Engine

| Use | Service |
|---|---|
| Fee schedule activation | `FeeScheduleService` → `AuthorityEvaluationService` |
| Refund authorization | `RefundService.authorizeRefund()` |
| Reconciliation batch closure | `ReconciliationService.closeBatch()` |

Financial and integration consequential actions evaluate authority explicitly. Technical admin and session access alone do not authorize these operations.

### Phase 5 — Service Catalog & Forms

| Link | Relationship |
|---|---|
| `FeeSchedule.governmentServiceId` | Fee schedules may bind to published `GovernmentService` |
| `GovernmentServiceFeeDefinition` | Phase 5 fee metadata; Phase 11 schedules operationalize tariffs |
| `MandatoryCommunicationRule.governmentServiceId` | Service-triggered mandatory communications |
| Application start package | Phase 5 pins fee configuration references consumed by Phase 11 assessment |

Phase 5 fee definitions are metadata only. Phase 11 assessments and invoices are the operational financial records.

### Phase 6 — Applications, Workflow & Case Management

| Link | Relationship |
|---|---|
| `FeeAssessment.caseId` / `applicationId` | Financial obligation linked to case/application |
| `Invoice.caseId` | Invoice may reference case |
| `CommunicationMessage.caseId` | Messages linked to case timeline |
| `IntegrationRequest.caseId` | Exchanges linked to case context |

Payment settlement does not complete workflow steps, mutate `Case` status, or satisfy `DECISION_GATE` / `ISSUANCE_GATE`.

### Phase 7 — Evidence & Master Administrative File

| Link | Relationship |
|---|---|
| `FeeAssessment.masterAdministrativeFileId` | Assessments indexed to MAF section 14 |
| `Invoice.masterAdministrativeFileId` | Required MAF linkage for invoices |
| `CommunicationMessage.masterAdministrativeFileId` | Messages indexed to MAF section 15 |
| `IntegrationRequest.masterAdministrativeFileId` | Integration requests indexed to MAF section 15 |
| `MafIndexingService` | `GET /operational-support/maf/:id/index` builds section 14/15 references |

Phase 11 indexes references into the MAF; it does not replace Phase 7 `GovernmentCommunicationRecord` or evidence acceptance semantics.

### Phase 8 — Decisions & Issuance

| Link | Relationship |
|---|---|
| `CommunicationMessage.decisionNoticeReference` | Referential link to decision notice artifact |
| Payment / receipt flows | Explicitly blocked from altering `GovernmentDecision` or instrument state |

Payment success and receipt issuance are orthogonal to decision execution and instrument lifecycle.

### Phase 9 — Inspection & Compliance

| Link | Relationship |
|---|---|
| Compliance communications | May use Phase 11 delivery stack for institutional notices |
| Financial penalties | Phase 11 may assess/invoice fees; Phase 9 retains violation/enforcement boundaries |

Phase 11 does not create compliance findings, inspection outcomes, or enforcement referrals.

### Phase 10 — Redress & Appeals

| Link | Relationship |
|---|---|
| `RefundRequest.redressImplementationActionId` | Refund tied to implementation action |
| `RedressRefundBridgeService` | Executes `REFUND_IF_AUTHORIZED` remedies only |
| `REDRESS_REFUND_LIFECYCLE_SERVICE` | Lifecycle reference on completed implementation action |

Redress determination remains in Phase 10. Phase 11 executes authorized refund mechanics only after remedy type and action status permit it.

---

## Master Administrative File indexing

`MafIndexingService.buildOperationalSupportIndex()` returns:

| Section | Contents |
|---|---|
| **Section 14** (`FEES_AND_FINANCIAL_RECORDS`) | `FeeAssessment`, `Invoice`, `RefundRequest` |
| **Section 15** (`COMMUNICATIONS_AND_NOTICES`) | `CommunicationMessage`, `IntegrationRequest` |

Indexing is referential. It does not imply completeness, approval, or legal effectiveness.

---

## API surface

All routes are under `/api/v1/operational-support/*`, guarded by `SessionAuthGuard`.

### Boundary & MAF

- `GET /operational-support/boundary` — operational support disclaimer
- `GET /operational-support/maf/:masterAdministrativeFileId/index` — MAF sections 14 and 15 index

### Financial

- `GET /operational-support/financial/invoices/:invoiceNumber`
- `GET /operational-support/financial/payment-intents/:intentReference`
- `GET /operational-support/financial/payment-transactions/:id`
- `GET /operational-support/financial/fee-assessments/:id`
- `GET /operational-support/financial/refund-authorizations/:authorizationReference`
- `GET /operational-support/financial/approvals/:id`
- `GET /operational-support/financial/reconciliation/:batchReference`
- `POST /operational-support/financial/payment-webhooks`

### Communications

- `POST /operational-support/communications/templates`
- `POST /operational-support/communications/templates/versions`
- `POST /operational-support/communications/messages`
- `POST /operational-support/communications/messages/:id/approve`
- `POST /operational-support/communications/messages/:id/deliver`

### Integrations

- `POST /operational-support/integrations/definitions`
- `POST /operational-support/integrations/definitions/:id/endpoints`
- `POST /operational-support/integrations/definitions/:id/status`
- `GET /operational-support/integrations/definitions/:id`
- `GET /operational-support/integrations/definitions/:id/acceptance`
- `POST /operational-support/integrations/acceptance`
- `POST /operational-support/integrations/exchanges`
- `POST /operational-support/integrations/webhooks`
- `POST /operational-support/integrations/registry-queries`
- `POST /operational-support/integrations/discrepancies`
- `POST /operational-support/integrations/outages/:integrationDefinitionId/fallback`
- `POST /operational-support/integrations/redress-refunds`

---

## Test strategy

### Schema coherence

| Suite | Path | Coverage |
|---|---|---|
| Schema guard | `src/operational-support/operational-support-schema.spec.ts` | All `PHASE_11_*_MODEL_NAMES` and `PHASE_11_*_ENUM_NAMES` exist in Prisma |

### Must-fail invariants (required)

`test/phase-11-operational-support.must-fail.e2e-spec.ts` (planned) must assert all 18 boundary invariants, including:

1. Payment payload with `caseStatus` / `governmentDecisionId` rejected
2. Client-supplied invoice totals rejected
3. Issued invoice total mutation rejected (`ISSUED_INVOICE_IMMUTABLE`)
4. Payment webhook amount/currency mismatch rejected
5. Duplicate webhook idempotency behavior
6. Invalid webhook signature rejected
7. PAN/CVV fields in webhook payload rejected
8. Refund exceeding settled amount rejected
9. Refund authorizer same as requester rejected
10. Fee schedule activation without authority denied
11. Acceptance status skip (e.g. initial `OPERATIONALLY_ACTIVE`) rejected
12. Acceptance regression rejected
13. SSRF URL template registration rejected
14. Resolved exchange URL host mismatch rejected
15. Template injection patterns rejected
16. Draft message delivery rejected
17. Material discrepancy `SAFE_HALTED` resolution without review rejected
18. Redress refund bridge rejected for non-`REFUND_IF_AUTHORIZED` remedies

### Integration tests (required)

`test/phase-11-operational-support.integration-spec.ts` (planned):

- Fee assessment → invoice → payment intent → webhook settlement → receipt with disclaimer
- Partial payment and invoice status transitions
- Refund request → authorization → transaction with authority evaluation fixture
- Reconciliation batch open → item mismatch → exception resolution → closure
- Template approve/activate → message approve → deliver with preference and mandatory override
- Integration definition → sequential acceptance dossier → definition status mapping
- Registry query success and failure with outage circuit behavior
- Source discrepancy record and resolve
- MAF section 14/15 index ordering

### E2E flows (required)

`test/phase-11-operational-support.e2e-spec.ts` (planned):

1. End-to-end fee-to-receipt happy path linked to case and MAF
2. Mandatory communication delivery with alternate channel fallback
3. Integration acceptance progression through `OPERATIONALLY_ACTIVE`
4. Redress `REFUND_IF_AUTHORIZED` bridge completing implementation action
5. Outage fallback activation blocking live exchange
6. Payment webhook replay idempotency

Fixtures: `test/helpers/phase-11-test-fixtures.ts` (planned) with institution, service, case, MAF, provider, and integration definition seeds.

---

## Residual risks

| Risk | Mitigation status | Notes |
|---|---|---|
| Production payment provider adapters not yet implemented | Partial | `TestPaymentProviderAdapter` only; real HSM/vault integration required before production |
| Notification channel adapters limited to test email/SMS | Partial | Postal, portal, and secure messaging channels need production adapters |
| Circuit breaker state is in-process memory | Open | `IntegrationOutageService` circuit map is not cluster-durable; multi-instance deployments may disagree on circuit state |
| Registry query results not auto-applied to case records | By design | Requires explicit institutional workflow to consume external data; risk of operator expectation mismatch |
| `RedressRefundBridgeService` authorizer/requester may be same session in controller | Open | Controller passes same `session.identityId` for both; production should enforce segregated actors |
| Webhook endpoints lack rate limiting in Phase 11 scope | Open | Depends on platform ingress/WAF configuration |
| Translation and accessibility records exist but are not wired to delivery rendering | Open | Models present; end-to-end locale/accommodation application pending |
| Integration credential rotation workflow | Partial | `IntegrationCredentialReference.rotatedAt` / `expiresAt` exist; automated rotation not implemented |
| Financial dispute resolution path | Partial | `FinancialDispute` model exists; dedicated resolution service not yet exposed via API |
| Concurrent partial payments on same invoice | Partial | Transactional settlement helps; explicit optimistic locking on invoice not yet documented in service layer |

---

## Explicit exclusions (Phase 11 boundary)

Phase 11 does NOT:

- record `GovernmentDecision` or issue `OfficialInstrument`
- mutate `Case` status based on payment or delivery success
- treat payment receipts as decision notices
- treat integration connectivity as legal authority
- automatically synchronize external registry data into case/disposition fields
- store PAN, CVV, or magnetic stripe data
- allow clients to set server-authoritative financial totals or statuses
- implement general ledger, treasury management, or tax reporting beyond reconciliation control records
