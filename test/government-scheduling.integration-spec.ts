import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  ApplicationStatus,
  AppointmentParticipantRole,
  CaseStatus,
  OperationalSuspensionScope,
  RepresentativeAuthorityStatus,
  ServiceAppointmentAuditEventType,
  ServiceAppointmentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { SchedulingBoundaryService } from '../src/scheduling/common/scheduling-boundary.service';
import { ServiceAppointmentsService } from '../src/scheduling/service-appointments/service-appointments.service';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type Phase6FixtureContext, seedPhase6Fixture } from './helpers/phase-6-test-fixtures';

describe('Government service scheduling (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Phase6FixtureContext;
  let appointmentsService: ServiceAppointmentsService;
  let boundary: SchedulingBoundaryService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    appointmentsService = app.get(ServiceAppointmentsService);
    boundary = app.get(SchedulingBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedPhase6Fixture(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createCitizen(loginSuffix: string) {
    return provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: `sched-${loginSuffix}@test.gov`,
      password: 'SchedTest123!',
      givenName: 'Sched',
      familyName: loginSuffix,
      displayName: `Sched ${loginSuffix}`,
    });
  }

  async function createServiceAppointment(input: {
    primaryParticipantIdentityId: string;
    organizationId?: string;
    representativeOrganizationId?: string;
    departmentId?: string;
    caseId?: string;
    actorIdentityId?: string;
  }) {
    return appointmentsService.create(
      {
        institutionId: fixture.institutionId,
        departmentId: input.departmentId ?? fixture.departmentId,
        governmentServiceId: fixture.governmentServiceId,
        caseId: input.caseId,
        organizationId: input.organizationId,
        representativeOrganizationId: input.representativeOrganizationId,
        primaryParticipantIdentityId: input.primaryParticipantIdentityId,
        scheduledStartsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledEndsAt: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ).toISOString(),
      },
      input.actorIdentityId,
    );
  }

  it('denies citizen from viewing another citizen appointment', async () => {
    const owner = await createCitizen('owner');
    const intruder = await createCitizen('intruder');
    const appointment = await createServiceAppointment({
      primaryParticipantIdentityId: owner.identityId,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${intruder.sessionToken}`)
      .expect(404);
  });

  it('denies business representative from viewing unrelated organization appointments', async () => {
    const representative = await createCitizen('biz-rep');
    const orgA = await prisma.organization.create({ data: { code: 'SCHED-ORG-A', name: 'Org A' } });
    const orgB = await prisma.organization.create({ data: { code: 'SCHED-ORG-B', name: 'Org B' } });

    await prisma.representativeAuthority.create({
      data: {
        organizationId: orgA.id,
        identityId: representative.identityId,
        scopeDescription: 'Org A only',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const participant = await createCitizen('biz-applicant');
    const appointment = await createServiceAppointment({
      primaryParticipantIdentityId: participant.identityId,
      organizationId: orgB.id,
      representativeOrganizationId: orgB.id,
    });

    await prisma.appointmentParticipant.updateMany({
      where: { serviceAppointmentId: appointment.id },
      data: { role: AppointmentParticipantRole.REPRESENTATIVE, organizationId: orgB.id },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${orgB.id}/appointments`)
      .set('Authorization', `Bearer ${representative.sessionToken}`)
      .expect(403);
  });

  it('denies official from viewing appointment outside department scope', async () => {
    const citizen = await createCitizen('dept-citizen');
    const otherDepartment = await prisma.department.create({
      data: {
        institutionId: fixture.institutionId,
        code: 'SCHED-OTHER-DEPT',
        name: 'Other Department',
      },
    });

    const appointment = await createServiceAppointment({
      primaryParticipantIdentityId: citizen.identityId,
      departmentId: otherDepartment.id,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/official/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(404);
  });

  it('audits rescheduling and cancellation', async () => {
    const citizen = await createCitizen('audit-citizen');
    const appointment = await createServiceAppointment({
      primaryParticipantIdentityId: citizen.identityId,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/experience/citizen/appointments/${appointment.id}/reschedule-request`)
      .set('Authorization', `Bearer ${citizen.sessionToken}`)
      .send({
        requestedStartsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Conflict',
      })
      .expect(201);

    const rescheduleAudit = await prisma.serviceAppointmentAuditEvent.findFirst({
      where: {
        serviceAppointmentId: appointment.id,
        eventType: ServiceAppointmentAuditEventType.RESCHEDULE_REQUESTED,
      },
    });
    expect(rescheduleAudit).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/api/v1/experience/citizen/appointments/${appointment.id}/cancel`)
      .set('Authorization', `Bearer ${citizen.sessionToken}`)
      .send({ reason: 'No longer needed' })
      .expect(201);

    const cancelAudit = await prisma.serviceAppointmentAuditEvent.findFirst({
      where: {
        serviceAppointmentId: appointment.id,
        eventType: ServiceAppointmentAuditEventType.CANCELLED,
      },
    });
    expect(cancelAudit).not.toBeNull();
  });

  it('does not change case status when appointment is completed', async () => {
    const citizen = await createCitizen('case-citizen');
    const application = await prisma.application.create({
      data: {
        applicantIdentityId: citizen.identityId,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.INDIVIDUAL,
        status: ApplicationStatus.RECEIVED,
      },
    });
    const caseRecord = await prisma.case.create({
      data: {
        caseNumber: `CASE-SCHED-${Date.now()}`,
        applicationId: application.id,
        applicantIdentityId: citizen.identityId,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        workflowVersionId: fixture.workflowVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        status: CaseStatus.SUBSTANTIVE_REVIEW,
      },
    });

    const appointment = await createServiceAppointment({
      primaryParticipantIdentityId: citizen.identityId,
      caseId: caseRecord.id,
      actorIdentityId: fixture.officialIdentityId,
    });

    const beforeStatus = caseRecord.status;

    await appointmentsService.complete(
      appointment.id,
      { outcomeNotes: 'Attended document verification' },
      fixture.officialIdentityId,
    );

    const afterCase = await prisma.case.findUniqueOrThrow({ where: { id: caseRecord.id } });
    expect(afterCase.status).toBe(beforeStatus);
    expect(afterCase.status).not.toBe(CaseStatus.DECIDED);
  });

  it('rejects instrument issuance from appointment completion path', () => {
    expect(() => boundary.rejectInstrumentIssuanceAttempt()).toThrow(
      'Service appointments cannot issue official instruments',
    );
  });

  it('rejects malicious client participant identity override', async () => {
    const actor = await createCitizen('actor');
    const victim = await createCitizen('victim');

    await request(app.getHttpServer())
      .post('/api/v1/scheduling/appointments')
      .set('Authorization', `Bearer ${actor.sessionToken}`)
      .send({
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentId,
        governmentServiceId: fixture.governmentServiceId,
        primaryParticipantIdentityId: victim.identityId,
        participants: [{ identityId: victim.identityId, role: 'APPLICANT' }],
        scheduledStartsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      })
      .expect(400);
  });

  it('blocks new appointment booking when service is operationally suspended', async () => {
    const citizen = await createCitizen('suspended');

    await prisma.operationalSuspension.create({
      data: {
        suspensionNumber: 'SUSP-SCHED-001',
        scope: OperationalSuspensionScope.SERVICE,
        targetReference: fixture.governmentServiceId,
        reason: 'Service temporarily unavailable',
        suspendedByIdentityId: fixture.officialIdentityId,
        status: 'ACTIVE',
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/scheduling/appointments')
      .set('Authorization', `Bearer ${citizen.sessionToken}`)
      .send({
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentId,
        governmentServiceId: fixture.governmentServiceId,
        primaryParticipantIdentityId: citizen.identityId,
      })
      .expect(400);
  });

  it('records communication reminder without creating legal notice', async () => {
    const citizen = await createCitizen('reminder');
    const appointment = await createServiceAppointment({
      primaryParticipantIdentityId: citizen.identityId,
    });

    const reminder = await prisma.serviceAppointmentReminder.findFirst({
      where: { serviceAppointmentId: appointment.id },
      include: { communicationMessage: true },
    });

    expect(reminder).not.toBeNull();
    expect(reminder?.isOperationalReminder).toBe(true);

    const audit = await prisma.serviceAppointmentAuditEvent.findFirst({
      where: {
        serviceAppointmentId: appointment.id,
        eventType: ServiceAppointmentAuditEventType.REMINDER_SCHEDULED,
      },
    });
    expect(audit?.metadata).toMatchObject({
      isOperationalReminder: true,
      isLegalNotice: false,
    });

    expect(reminder?.communicationMessage?.decisionNoticeReference).toBeNull();
    expect(reminder?.communicationMessage?.status).toBe('DRAFT');
  });

  it('lists citizen appointments only within participant scope', async () => {
    const owner = await createCitizen('list-owner');
    const other = await createCitizen('list-other');
    await createServiceAppointment({ primaryParticipantIdentityId: owner.identityId });
    await createServiceAppointment({ primaryParticipantIdentityId: other.identityId });

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/appointments')
      .set('Authorization', `Bearer ${owner.sessionToken}`)
      .expect(200);

    const body = response.body as { items: { status: string }[] };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.status).toBe(ServiceAppointmentStatus.SCHEDULED);
  });
});
