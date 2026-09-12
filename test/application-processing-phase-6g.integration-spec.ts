import { type INestApplication } from '@nestjs/common';
import {
  CaseCommunicationType,
  CaseEventPublicVisibility,
  CaseEventType,
  CaseMilestoneStatus,
  CasePublicStatusStage,
  CaseRecipientType,
  CaseStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { CaseFoundationService } from '../src/application-processing/cases/case-foundation.service';
import { CaseEventService } from '../src/application-processing/cases/timeline/case-event.service';
import { CasePublicStatusProjectionService } from '../src/application-processing/cases/timeline/case-public-status-projection.service';
import { type PrismaService } from '../src/database/prisma.service';
import {
  seedApplicationProcessingFixture,
  seedCaseFromApplication,
} from './helpers/application-processing-test-fixtures';
import {
  asCaseCommunicationBody,
  asCaseCommunicationsBody,
  asCaseDashboardBody,
  asCasePublicStatusBody,
  asCaseTimelineBody,
} from './helpers/application-processing-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 6G case timeline, communications, and applicant status', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Awaited<ReturnType<typeof seedApplicationProcessingFixture>>;
  let caseId: string;

  beforeAll(async () => {
    const integration = await createIntegrationApp();
    app = integration.app;
    prisma = integration.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedApplicationProcessingFixture(app, prisma);
    const foundation = app.get(CaseFoundationService);
    const seeded = await seedCaseFromApplication(prisma, foundation, fixture);
    caseId = seeded.caseId;
  });

  it('keeps case events append-only', async () => {
    const eventService = app.get(CaseEventService);
    await expect(eventService.updateEvent()).rejects.toThrow(/append-only/i);
    await expect(eventService.deleteEvent()).rejects.toThrow(/append-only/i);
  });

  it('excludes internal notes from applicant communications and timeline', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/communications`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        communicationType: CaseCommunicationType.INTERNAL_NOTE,
        recipientType: CaseRecipientType.INTERNAL,
        channel: 'PORTAL',
        body: 'Privileged legal advice — must not leak',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/communications`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        communicationType: CaseCommunicationType.STATUS_UPDATE,
        recipientType: CaseRecipientType.APPLICANT,
        channel: 'PORTAL',
        body: 'Your application is being reviewed.',
        publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
      })
      .expect(201);

    const applicantCommsResponse = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/communications/applicant`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const applicantComms = asCaseCommunicationsBody(applicantCommsResponse.body);
    expect(applicantComms).toHaveLength(1);
    const [visibleCommunication] = applicantComms;
    if (!visibleCommunication) {
      throw new Error('Expected applicant-visible communication');
    }
    expect(visibleCommunication.communicationType).toBe(CaseCommunicationType.STATUS_UPDATE);
    expect(visibleCommunication.body).not.toContain('Privileged legal advice');
  });

  it('derives applicant status from authoritative case state', async () => {
    await prisma.case.update({
      where: { id: caseId },
      data: { caseStatus: CaseStatus.DECISION_PENDING },
    });

    const projectionService = app.get(CasePublicStatusProjectionService);
    const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
    await projectionService.deriveFromCase(caseRecord);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/public-status`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const status = asCasePublicStatusBody(response.body);
    expect(status.publicStage).toBe(CasePublicStatusStage.DECISION_PENDING);
    expect(status.publicStageLabel).toBe('Decision pending');
    expect(status.publicStageDetail).toContain('No outcome has been recorded');
    expect(response.body as Record<string, unknown>).not.toHaveProperty('decisionResult');
  });

  it('rejects client attempts to set public status independently', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/public-status`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ publicStage: CasePublicStatusStage.COMPLETED })
      .expect(403);
  });

  it('preserves communication sender, recipient, channel, and timestamps', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/communications`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        communicationType: CaseCommunicationType.DEFICIENCY_NOTICE,
        senderIdentityId: fixture.officialIdentityId,
        recipientType: CaseRecipientType.APPLICANT,
        recipientReference: fixture.applicantIdentityId,
        channel: 'EMAIL',
        subject: 'Additional documents required',
        body: 'Please upload your business registration certificate.',
      })
      .expect(201);

    const communication = asCaseCommunicationBody(response.body);
    expect(communication.senderIdentityId).toBe(fixture.officialIdentityId);
    expect(communication.recipientType).toBe(CaseRecipientType.APPLICANT);
    expect(communication.channel).toBe('EMAIL');
    expect(communication.sentAt).toBeTruthy();
  });

  it('treats milestone delay as operational status, not refusal', async () => {
    const milestoneResponse = await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/milestones`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({ name: 'Completeness review', targetDate: '2026-01-01T00:00:00.000Z' })
      .expect(201);

    const milestoneId = (milestoneResponse.body as { id: string }).id;
    await prisma.caseMilestone.update({
      where: { id: milestoneId },
      data: { status: CaseMilestoneStatus.DELAYED },
    });

    const projectionResponse = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/public-status`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const projection = asCasePublicStatusBody(projectionResponse.body);
    expect(projection.publicStage).not.toBe('REFUSED');
    expect(projection.publicStage).not.toBe('DENIED');
  });

  it('shows safe halt without exposing restricted reason detail to applicants', async () => {
    const eventService = app.get(CaseEventService);
    await eventService.append({
      caseId,
      eventType: CaseEventType.SAFE_HALT,
      publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
      metadata: {
        publicLabel: 'Processing paused',
        restrictedReason: 'SECURITY_FLAG: classified intelligence reference',
      },
    });

    const timelineResponse = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/timeline/applicant`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const timeline = asCaseTimelineBody(timelineResponse.body);
    const safeHaltEvents = timeline.filter((event) => event.eventType === CaseEventType.SAFE_HALT);
    expect(safeHaltEvents).toHaveLength(0);

    await prisma.case.update({
      where: { id: caseId },
      data: { caseStatus: CaseStatus.SAFE_HALT },
    });

    const projectionService = app.get(CasePublicStatusProjectionService);
    const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: caseId } });
    await projectionService.deriveFromCase(caseRecord);

    const statusResponse = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/public-status`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const status = asCasePublicStatusBody(statusResponse.body);
    expect(status.publicStageDetail).not.toContain('SECURITY_FLAG');
    expect(status.publicStageDetail).toContain('temporarily paused');
  });

  it('reconstructs operational event sequence for officials', async () => {
    const eventService = app.get(CaseEventService);
    await eventService.append({
      caseId,
      eventType: CaseEventType.WORKFLOW_STARTED,
      publicVisibility: CaseEventPublicVisibility.OFFICIAL,
    });
    await eventService.append({
      caseId,
      eventType: CaseEventType.STEP_STARTED,
      publicVisibility: CaseEventPublicVisibility.OFFICIAL,
    });

    const timelineResponse = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/timeline`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);

    const timeline = asCaseTimelineBody(timelineResponse.body);
    const eventTypes = timeline.map((event) => event.eventType);
    expect(eventTypes).toContain(CaseEventType.APPLICATION_RECEIVED);
    expect(eventTypes).toContain(CaseEventType.CASE_OPENED);
    expect(eventTypes).toContain(CaseEventType.WORKFLOW_STARTED);
    expect(eventTypes.indexOf(CaseEventType.WORKFLOW_STARTED)).toBeLessThan(
      eventTypes.lastIndexOf(CaseEventType.STEP_STARTED),
    );
  });

  it('dashboard does not imply authority from assignment alone', async () => {
    await prisma.case.update({
      where: { id: caseId },
      data: { currentCaseManagerOfficeholderId: fixture.officeholderId },
    });

    const dashboardResponse = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/dashboard`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const dashboard = asCaseDashboardBody(dashboardResponse.body);
    expect(dashboard.caseManager).toBeTruthy();
    expect(dashboard.assignmentDoesNotImplyAuthority).toBe(true);
    expect(dashboard.nextAuthorizedAdministrativeActions).toBeDefined();
  });
});
