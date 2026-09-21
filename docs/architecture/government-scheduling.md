# Government Service Scheduling

HeartStone distinguishes **institutional appointments** (officeholder-to-office assignments under `src/government/appointments`) from **service appointments** (citizen, business, and official scheduled interactions under `src/scheduling`).

## Domain boundary

| Concept | Model | Meaning |
|---------|-------|---------|
| Institutional appointment | `Appointment` | Legal assignment of an `Officeholder` to an `Office` |
| Service appointment | `ServiceAppointment` | Scheduled government interaction (citizen service, inspection, interview, etc.) |

Service appointment status values (`REQUESTED`, `SCHEDULED`, `CONFIRMED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`) are operational labels only. They do not encode legal outcomes.

## Core models

- `ServiceAppointment` — primary aggregate; references institution, department, `GovernmentService`, application, case, organization, assigned official/resource, and physical or virtual location.
- `AppointmentSlot`, `AppointmentLocation`, `AppointmentResource`, `AppointmentReason` — scheduling catalog.
- `AppointmentParticipant` — scoped participants (applicant, representative, official, resource, observer).
- `AppointmentReschedule`, `AppointmentCancellation`, `AppointmentAttendance`, `AppointmentOutcomeReference` — lifecycle records.
- `ServiceAppointmentAuditEvent` — immutable audit trail.
- `ServiceAppointmentReminder` — operational reminders linked to `CommunicationMessage`.

## API surfaces

### Experience layer (scoped read/action)

| Audience | Routes |
|----------|--------|
| Citizen | `GET/POST /api/v1/experience/citizen/appointments*` |
| Business | `GET /api/v1/experience/business/organizations/:organizationId/appointments` |
| Official | `GET /api/v1/experience/official/appointments*` |

### Administrative scheduling domain

All catalog and administrative lifecycle endpoints live under `/api/v1/scheduling/*` (not the experience layer):

- `/scheduling/appointments`
- `/scheduling/slots`
- `/scheduling/locations`
- `/scheduling/resources`
- `/scheduling/reasons`

## Security invariants

- Participants see only appointments within their scope.
- Organization representatives require valid representative authority scope.
- Officials require institutional department scope.
- Scheduling does **not** create authority or imply approval.
- Completion does **not** change case legal status or issue instruments.
- Participant identity is assigned server-side; clients cannot override it.
- Operational reminders are not legal notices unless separately issued through the formal notice process.

## Operational suspension

When an `OperationalSuspension` targets a `GovernmentService`, new service appointment booking is blocked for that service.

## Audit events

Creation, confirmation, reschedule request, reschedule approval, cancellation, completion, and reminder scheduling are recorded in `ServiceAppointmentAuditEvent`.

## Projections

Citizen home and official workspace summaries include upcoming service appointment counts derived from scoped queries.
