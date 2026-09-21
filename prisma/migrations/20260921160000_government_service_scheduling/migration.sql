-- Government Service Scheduling domain (distinct from institutional officeholder Appointment)

CREATE TYPE "ServiceAppointmentStatus" AS ENUM (
  'REQUESTED',
  'SCHEDULED',
  'CONFIRMED',
  'RESCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW'
);

CREATE TYPE "AppointmentLocationKind" AS ENUM ('PHYSICAL', 'VIRTUAL', 'HYBRID');

CREATE TYPE "AppointmentParticipantRole" AS ENUM (
  'APPLICANT',
  'REPRESENTATIVE',
  'OFFICIAL',
  'RESOURCE',
  'OBSERVER'
);

CREATE TYPE "AppointmentRescheduleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "AppointmentAttendanceStatus" AS ENUM (
  'EXPECTED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'NO_SHOW'
);

CREATE TYPE "ServiceAppointmentAuditEventType" AS ENUM (
  'CREATED',
  'CONFIRMED',
  'RESCHEDULE_REQUESTED',
  'RESCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'REMINDER_SCHEDULED'
);

CREATE TYPE "AppointmentOutcomeReferenceType" AS ENUM (
  'CASE_EVENT',
  'DOCUMENT',
  'NOTE',
  'EXTERNAL_REFERENCE'
);

CREATE TABLE "appointment_reasons" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "institutionId" UUID,
  "departmentId" UUID,
  "governmentServiceId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_reasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_locations" (
  "id" UUID NOT NULL,
  "locationReference" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "AppointmentLocationKind" NOT NULL,
  "institutionId" UUID,
  "departmentId" UUID,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "postalCode" TEXT,
  "virtualMeetingUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_resources" (
  "id" UUID NOT NULL,
  "resourceReference" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "officeholderId" UUID,
  "identityId" UUID,
  "departmentId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_slots" (
  "id" UUID NOT NULL,
  "slotReference" TEXT NOT NULL,
  "institutionId" UUID NOT NULL,
  "departmentId" UUID,
  "governmentServiceId" UUID,
  "locationId" UUID,
  "resourceId" UUID,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "bookedCount" INTEGER NOT NULL DEFAULT 0,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_appointments" (
  "id" UUID NOT NULL,
  "appointmentReference" TEXT NOT NULL,
  "status" "ServiceAppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "institutionId" UUID NOT NULL,
  "departmentId" UUID,
  "governmentServiceId" UUID,
  "applicationId" UUID,
  "caseId" UUID,
  "organizationId" UUID,
  "appointmentReasonId" UUID,
  "appointmentSlotId" UUID,
  "appointmentLocationId" UUID,
  "assignedResourceId" UUID,
  "assignedOfficialIdentityId" UUID,
  "assignedOfficialOfficeholderId" UUID,
  "scheduledStartsAt" TIMESTAMP(3),
  "scheduledEndsAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "isVirtual" BOOLEAN NOT NULL DEFAULT false,
  "virtualMeetingUrl" TEXT,
  "operationalNotes" TEXT,
  "createdByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_participants" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "role" "AppointmentParticipantRole" NOT NULL,
  "organizationId" UUID,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_reschedules" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "requestedByIdentityId" UUID NOT NULL,
  "previousStartsAt" TIMESTAMP(3),
  "previousEndsAt" TIMESTAMP(3),
  "requestedStartsAt" TIMESTAMP(3),
  "requestedEndsAt" TIMESTAMP(3),
  "reason" TEXT,
  "status" "AppointmentRescheduleStatus" NOT NULL DEFAULT 'PENDING',
  "approvedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_reschedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_cancellations" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "cancelledByIdentityId" UUID NOT NULL,
  "reason" TEXT,
  "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_cancellations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_attendances" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "attendanceStatus" "AppointmentAttendanceStatus" NOT NULL DEFAULT 'EXPECTED',
  "checkedInAt" TIMESTAMP(3),
  "checkedOutAt" TIMESTAMP(3),
  "recordedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_attendances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_outcome_references" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "referenceType" "AppointmentOutcomeReferenceType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "description" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_outcome_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_appointment_audit_events" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "eventType" "ServiceAppointmentAuditEventType" NOT NULL,
  "actorIdentityId" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_appointment_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_appointment_reminders" (
  "id" UUID NOT NULL,
  "serviceAppointmentId" UUID NOT NULL,
  "communicationMessageId" UUID,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "isOperationalReminder" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_appointment_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appointment_reasons_code_key" ON "appointment_reasons"("code");
CREATE INDEX "appointment_reasons_institutionId_idx" ON "appointment_reasons"("institutionId");
CREATE INDEX "appointment_reasons_departmentId_idx" ON "appointment_reasons"("departmentId");
CREATE INDEX "appointment_reasons_governmentServiceId_idx" ON "appointment_reasons"("governmentServiceId");

CREATE UNIQUE INDEX "appointment_locations_locationReference_key" ON "appointment_locations"("locationReference");
CREATE INDEX "appointment_locations_institutionId_idx" ON "appointment_locations"("institutionId");
CREATE INDEX "appointment_locations_departmentId_idx" ON "appointment_locations"("departmentId");

CREATE UNIQUE INDEX "appointment_resources_resourceReference_key" ON "appointment_resources"("resourceReference");
CREATE INDEX "appointment_resources_departmentId_idx" ON "appointment_resources"("departmentId");
CREATE INDEX "appointment_resources_officeholderId_idx" ON "appointment_resources"("officeholderId");
CREATE INDEX "appointment_resources_identityId_idx" ON "appointment_resources"("identityId");

CREATE UNIQUE INDEX "appointment_slots_slotReference_key" ON "appointment_slots"("slotReference");
CREATE INDEX "appointment_slots_institutionId_idx" ON "appointment_slots"("institutionId");
CREATE INDEX "appointment_slots_departmentId_idx" ON "appointment_slots"("departmentId");
CREATE INDEX "appointment_slots_governmentServiceId_idx" ON "appointment_slots"("governmentServiceId");
CREATE INDEX "appointment_slots_startsAt_idx" ON "appointment_slots"("startsAt");

CREATE UNIQUE INDEX "service_appointments_appointmentReference_key" ON "service_appointments"("appointmentReference");
CREATE INDEX "service_appointments_status_idx" ON "service_appointments"("status");
CREATE INDEX "service_appointments_institutionId_idx" ON "service_appointments"("institutionId");
CREATE INDEX "service_appointments_departmentId_idx" ON "service_appointments"("departmentId");
CREATE INDEX "service_appointments_governmentServiceId_idx" ON "service_appointments"("governmentServiceId");
CREATE INDEX "service_appointments_applicationId_idx" ON "service_appointments"("applicationId");
CREATE INDEX "service_appointments_caseId_idx" ON "service_appointments"("caseId");
CREATE INDEX "service_appointments_organizationId_idx" ON "service_appointments"("organizationId");
CREATE INDEX "service_appointments_scheduledStartsAt_idx" ON "service_appointments"("scheduledStartsAt");

CREATE UNIQUE INDEX "appointment_participants_serviceAppointmentId_identityId_role_key"
  ON "appointment_participants"("serviceAppointmentId", "identityId", "role");
CREATE INDEX "appointment_participants_identityId_idx" ON "appointment_participants"("identityId");
CREATE INDEX "appointment_participants_organizationId_idx" ON "appointment_participants"("organizationId");

CREATE INDEX "appointment_reschedules_serviceAppointmentId_idx" ON "appointment_reschedules"("serviceAppointmentId");
CREATE INDEX "appointment_reschedules_requestedByIdentityId_idx" ON "appointment_reschedules"("requestedByIdentityId");

CREATE UNIQUE INDEX "appointment_cancellations_serviceAppointmentId_key" ON "appointment_cancellations"("serviceAppointmentId");

CREATE UNIQUE INDEX "appointment_attendances_serviceAppointmentId_key" ON "appointment_attendances"("serviceAppointmentId");

CREATE INDEX "appointment_outcome_references_serviceAppointmentId_idx" ON "appointment_outcome_references"("serviceAppointmentId");

CREATE INDEX "service_appointment_audit_events_serviceAppointmentId_idx" ON "service_appointment_audit_events"("serviceAppointmentId");
CREATE INDEX "service_appointment_audit_events_eventType_idx" ON "service_appointment_audit_events"("eventType");

CREATE INDEX "service_appointment_reminders_serviceAppointmentId_idx" ON "service_appointment_reminders"("serviceAppointmentId");
CREATE INDEX "service_appointment_reminders_communicationMessageId_idx" ON "service_appointment_reminders"("communicationMessageId");

ALTER TABLE "appointment_reasons"
  ADD CONSTRAINT "appointment_reasons_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_reasons_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_reasons_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_locations"
  ADD CONSTRAINT "appointment_locations_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_locations_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_resources"
  ADD CONSTRAINT "appointment_resources_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_resources_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_resources_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_slots"
  ADD CONSTRAINT "appointment_slots_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_slots_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_slots_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_slots_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "appointment_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_slots_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "appointment_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_appointments"
  ADD CONSTRAINT "service_appointments_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_appointmentReasonId_fkey"
  FOREIGN KEY ("appointmentReasonId") REFERENCES "appointment_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_appointmentSlotId_fkey"
  FOREIGN KEY ("appointmentSlotId") REFERENCES "appointment_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_appointmentLocationId_fkey"
  FOREIGN KEY ("appointmentLocationId") REFERENCES "appointment_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_assignedResourceId_fkey"
  FOREIGN KEY ("assignedResourceId") REFERENCES "appointment_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_assignedOfficialIdentityId_fkey"
  FOREIGN KEY ("assignedOfficialIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_assignedOfficialOfficeholderId_fkey"
  FOREIGN KEY ("assignedOfficialOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointments_createdByIdentityId_fkey"
  FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_participants"
  ADD CONSTRAINT "appointment_participants_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_participants_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_participants_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_reschedules"
  ADD CONSTRAINT "appointment_reschedules_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_reschedules_requestedByIdentityId_fkey"
  FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_reschedules_approvedByIdentityId_fkey"
  FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_cancellations"
  ADD CONSTRAINT "appointment_cancellations_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_cancellations_cancelledByIdentityId_fkey"
  FOREIGN KEY ("cancelledByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointment_attendances"
  ADD CONSTRAINT "appointment_attendances_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_attendances_recordedByIdentityId_fkey"
  FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_outcome_references"
  ADD CONSTRAINT "appointment_outcome_references_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "appointment_outcome_references_recordedByIdentityId_fkey"
  FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_appointment_audit_events"
  ADD CONSTRAINT "service_appointment_audit_events_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointment_audit_events_actorIdentityId_fkey"
  FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_appointment_reminders"
  ADD CONSTRAINT "service_appointment_reminders_serviceAppointmentId_fkey"
  FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "service_appointment_reminders_communicationMessageId_fkey"
  FOREIGN KEY ("communicationMessageId") REFERENCES "communication_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
