# HeartStone Experience Layer

## Objective

The HeartStone Experience Layer provides shared search, navigation, inbox, task aggregation, and frontend contract infrastructure for all citizen-facing and official-facing portals. Client applications interact with stable experience APIs instead of traversing hundreds of internal backend models directly.

## Architectural placement

```
Citizen Mobile App ──┐
Citizen Web Portal ──┤
Business Portal ─────┼──► src/experience/common/  (shared contracts)
Government Workstations ──┤         │
Platform Administration ──┘         ├──► src/experience/citizen/
                                    ├──► src/experience/official/
                                    └──► src/citizen-experience/ (projections)
                                              │
                                              ▼
                                    Domain modules (applications, records,
                                    operational support, authority, etc.)
```

## Shared module

All cross-persona experience infrastructure lives under `src/experience/common/`:

| Component | Purpose |
|---|---|
| `UnifiedExperienceSearchService` | Scoped search across actor-visible resources |
| `ExperienceNavigationService` | Persona-based frontend navigation metadata |
| `ExperienceInboxService` | Normalized inbox aggregation |
| `ExperienceActionCenterService` | Shared action contracts for citizen, business, and official personas |
| `ExperienceDeepLinkService` | Deep link resolution with backend authorization checks |
| `ExperienceLocalizationContract` | Localization-ready presentation labels |
| `ExperienceResponseMetadataService` | Standard response metadata and disclaimers |
| `ExperienceActorResolverService` | Resolves experience persona from authenticated actor context |

## HTTP surface (`/api/v1/experience/...`)

| Method | Route | Description |
|---|---|---|
| `GET` | `/metadata` | Response metadata and localization contract |
| `GET` | `/search` | Unified scoped search |
| `GET` | `/navigation` | Persona-based navigation metadata |
| `GET` | `/inbox` | Normalized inbox aggregation |
| `GET` | `/actions` | Normalized action center |
| `POST` | `/deep-links/resolve` | Authorize deep link navigation |

All routes require authenticated sessions. Actor identity is always derived from the session; client-supplied identity identifiers are never accepted.

## Experience personas

The experience layer recognizes nine personas. Personas describe **presentation context**, not legal authority.

### Citizen

Individual using government services in a personal capacity. Search covers own applications, documents, credentials, messages, payments, and publicly available government services. Navigation includes Home, Services, Applications, Documents, Payments, Messages, and Appointments.

### Resident

Individual classified through prior application categories as resident or non-resident. Uses the citizen navigation surface with the same scope rules as citizens.

### Business

Identity with active organization membership. Search includes owned businesses (organizations). Navigation includes Overview, Licenses, Employees, Projects, Compliance, Payments, and Messages.

### Investor

Identity with observed investor application categories or investor-related organization relationships. Uses the business navigation surface with investor-specific service discovery where configured.

### Authorized Representative

Identity with active representative authority over one or more organizations. Extends citizen navigation with Representations. Search and inbox include organization-scoped applications and messages where representative authority is active.

### Government Official

Identity with active officeholder link and current appointment. Search covers scoped cases, applications, applicants, organizations, government services, evidence references, and official instruments within department scope. Navigation includes Workspace, Cases, Evidence, Inspections, Decisions, Compliance, and Appeals.

### Department Management

Official with department management role marker and substantive access. Extends official navigation with Department Dashboard. Does not confer authority beyond evaluated institutional scope.

### Executive Leadership

Official with executive role marker and substantive access. Receives executive briefing navigation (Executive Dashboard, Institutional Overview). Executive visibility is informational only and does not confer command or decision authority.

### Platform Administration

Technical administrator without substantive appointment. Receives platform administration navigation (Platform Administration, System Health). Platform administration does not create case authority, decision authority, or substantive workspace access.

## Search boundaries

### Citizen and business search

Permitted resource types:

- government services (public catalog only)
- own applications
- own documents
- own credentials
- own messages
- own businesses (organization memberships)
- own payments

### Official search

Permitted resource types (subject to institutional scope):

- cases
- applications
- applicants (within scoped cases only)
- organizations (within scoped cases only)
- government services
- evidence references (restricted classifications filtered)
- official instruments

Cross-government database enumeration is prohibited. Every search hit is filtered through resource visibility checks before return.

## Inbox aggregation

The inbox normalizes:

- secure government messages (`CommunicationMessage`)
- requests for information
- payment notices
- appointment updates (case communications not duplicated when a matching `CommunicationMessage` exists)
- decision notices
- renewal notices
- compliance messages
- appeal/redress messages

`CommunicationMessage` records are never duplicated. Case communications with matching subjects on the same case are suppressed when a portal message already exists.

## Action center

Normalized action contracts include:

- `actionCode` — stable machine-readable identifier
- `actionType` — task, review, payment, response, renewal, acknowledgment, workflow, or decision
- `title`, `description` — localization-ready labels
- `priority`, `sourceDomain`, `resourceType`, `resourceId`
- `deepLink` — route and params for frontend navigation
- `dueDate`, `institution`, `department`, `status`
- `presentationOnly: true` — actions never imply authorization

For officials, available action presentation may use authority evaluation, but execution endpoints always re-evaluate authority at execution time.

## Navigation rules

Navigation metadata is filtered by persona and capability:

- Citizens never receive official or executive navigation
- Ordinary officials never receive executive navigation
- Platform administrators never receive substantive case navigation
- Each item includes an `accessible` flag based on evaluated capabilities

Navigation describes presentation capability only. Route access and consequential actions require separate authorization.

## Localization

All experience responses are localization-ready:

- Presentation labels include `label`, `labelKey`, and optional `labels` keyed by locale
- Authoritative record content (titles, bodies, reference numbers) remains in separate fields
- The experience layer does not hard-code jurisdiction-specific names into platform core strings

## Deep links

Deep link resolution validates:

- route registration
- required parameters
- actor scope (citizen access, official scope, organization membership)

Unauthorized deep links return `authorized: false` with a denial reason. Resolution never bypasses backend authorization.

## Critical invariants

1. **User != Officeholder != Role != Permission != Authority**
2. Experience responses never imply government decision authority
3. Search, navigation, inbox, and actions are presentation layers only
4. Access does not equal authority
5. Recommendations do not equal decisions
6. AI assistance does not equal an official decision

## Related documentation

- [Citizen Experience API](./citizen-experience-api.md)
- [Official Experience API](./official-experience-api.md)
- [Phase 14 Citizen Experience](./phase-14-citizen-experience.md)
- [Actor Context Trust Boundary](./actor-context-trust-boundary.md)
