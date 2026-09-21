import { type INestApplication } from '@nestjs/common';
import {
  CommunicationChannelType,
  CommunicationDeliveryStatus,
  CommunicationMessageStatus,
  DocumentAssociationTargetType,
  DocumentSecurityClassification,
  DocumentSourceType,
  OfficialInstrumentStatus,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../../src/database/prisma.service';
import { IssuanceService } from '../../src/decisions-issuance/issuance/issuance.service';
import { CommunicationMessageService } from '../../src/operational-support/communications/communication-message.service';
import {
  associateDocumentToApplication,
  uploadTestDocument,
} from './evidence-records-test-fixtures';
import { asLoginResponseBody } from './identity-test-types';
import { executeGovernmentDecision } from './phase-8-test-fixtures';
import {
  calculateAndInvoiceFees,
  type Phase11FixtureContext,
  seedPhase11Fixture,
} from './phase-11-test-fixtures';

export const NON_PRODUCTION_CITIZEN_EXPERIENCE_MARKER = 'NON_PRODUCTION_CITIZEN_EXPERIENCE';

export interface CitizenExperienceFixtureContext extends Phase11FixtureContext {
  applicationId: string;
  accessibleDocumentId: string;
  restrictedDocumentId: string;
  activeInstrumentId: string;
  revokedInstrumentId: string;
  expiredInstrumentId: string;
  portalMessageId: string;
  invoiceId: string;
  governmentDecisionId: string;
}

async function ensureGovernmentDecision(
  app: INestApplication<App>,
  fixture: Phase11FixtureContext,
): Promise<string> {
  if (fixture.governmentDecisionId) {
    return fixture.governmentDecisionId;
  }

  const existing = await app.get(PrismaService).governmentDecision.findFirst({
    where: { caseId: fixture.caseId },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const decision = await executeGovernmentDecision(app, fixture, 'APPROVED', {
    matterDecided: 'Citizen experience fixture decision',
  });

  return decision.id;
}

export async function seedCitizenExperienceFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<CitizenExperienceFixtureContext> {
  const phase11 = await seedPhase11Fixture(app, prisma);
  const marker = NON_PRODUCTION_CITIZEN_EXPERIENCE_MARKER;
  const governmentDecisionId = await ensureGovernmentDecision(app, phase11);

  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: phase11.caseId },
    select: { applicationId: true },
  });

  await prisma.instrumentTypeVersion.update({
    where: { id: phase11.instrumentTypeVersionId },
    data: {
      renewalProcedure: {
        renewalWindowDaysBeforeExpiry: 90,
        nextStep: 'Submit renewal through the licensing service portal',
      },
      durationExpiryRule: { defaultDurationDays: 365 },
    },
  });

  const accessibleDoc = await uploadTestDocument(
    app,
    phase11.applicantSessionToken,
    Buffer.from('citizen-accessible-document'),
    'accessible.pdf',
  );
  await associateDocumentToApplication(
    app,
    phase11.applicantSessionToken,
    accessibleDoc.versionId,
    caseRecord.applicationId,
  );

  const restrictedVersion = await prisma.documentVersion.create({
    data: {
      documentRecord: {
        create: {
          documentNumber: `${marker}-RESTRICTED-DOC`,
          title: 'Internal restricted deliberation record',
          documentType: 'internal_deliberation',
          sourceType: DocumentSourceType.OFFICIAL_UPLOAD,
          owningInstitutionId: phase11.institutionId,
        },
      },
      versionNumber: 1,
      originalFilename: 'restricted.pdf',
      contentType: 'application/pdf',
      sizeBytes: 12,
      storageProvider: 'inline',
      storageObjectKey: `${marker}/restricted`,
      sha256: 'restricted-hash',
      securityClassification: DocumentSecurityClassification.RESTRICTED,
    },
    include: { documentRecord: true },
  });

  await prisma.documentAssociation.create({
    data: {
      documentRecordId: restrictedVersion.documentRecordId,
      documentVersionId: restrictedVersion.id,
      targetType: DocumentAssociationTargetType.CASE,
      targetId: phase11.caseId,
    },
  });

  const issuance = app.get(IssuanceService);

  const activeIssue = await issuance.issue({
    governmentDecisionId,
    instrumentTypeVersionId: phase11.instrumentTypeVersionId,
    caseId: phase11.caseId,
    issuerIdentityId: phase11.officialIdentityId,
    issuerOfficeholderId: phase11.officialOfficeholderId,
    issuerOfficeId: phase11.officeId,
    issuerAppointmentId: phase11.appointmentId,
    holderIdentityId: phase11.applicantIdentityId,
    sealDocumentVersionId: phase11.sealDocumentVersionId,
    scope: { summary: 'Active license scope' },
    effectiveFrom: new Date('2026-01-01'),
    effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    freeFormFields: { holderName: 'Applicant Holder' },
    idempotencyKey: `${marker}-active-instrument`,
  });

  await prisma.officialInstrument.update({
    where: { id: activeIssue.instrument.id },
    data: {
      status: OfficialInstrumentStatus.EFFECTIVE,
      effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const revokedIssue = await issuance.issue({
    governmentDecisionId,
    instrumentTypeVersionId: phase11.instrumentTypeVersionId,
    caseId: phase11.caseId,
    issuerIdentityId: phase11.officialIdentityId,
    issuerOfficeholderId: phase11.officialOfficeholderId,
    issuerOfficeId: phase11.officeId,
    issuerAppointmentId: phase11.appointmentId,
    holderIdentityId: phase11.applicantIdentityId,
    sealDocumentVersionId: phase11.sealDocumentVersionId,
    scope: { summary: 'Revoked permit scope' },
    effectiveFrom: new Date('2025-01-01'),
    effectiveUntil: new Date('2026-12-31'),
    freeFormFields: { holderName: 'Applicant Holder' },
    idempotencyKey: `${marker}-revoked-instrument`,
  });

  await prisma.officialInstrument.update({
    where: { id: revokedIssue.instrument.id },
    data: { status: OfficialInstrumentStatus.REVOKED },
  });

  const expiredIssue = await issuance.issue({
    governmentDecisionId,
    instrumentTypeVersionId: phase11.instrumentTypeVersionId,
    caseId: phase11.caseId,
    issuerIdentityId: phase11.officialIdentityId,
    issuerOfficeholderId: phase11.officialOfficeholderId,
    issuerOfficeId: phase11.officeId,
    issuerAppointmentId: phase11.appointmentId,
    holderIdentityId: phase11.applicantIdentityId,
    sealDocumentVersionId: phase11.sealDocumentVersionId,
    scope: { summary: 'Expired registration scope' },
    effectiveFrom: new Date('2024-01-01'),
    effectiveUntil: new Date('2025-01-01'),
    freeFormFields: { holderName: 'Applicant Holder' },
    idempotencyKey: `${marker}-expired-instrument`,
  });

  await prisma.officialInstrument.update({
    where: { id: expiredIssue.instrument.id },
    data: {
      status: OfficialInstrumentStatus.EXPIRED,
      effectiveUntil: new Date('2025-01-01'),
    },
  });

  const messages = app.get(CommunicationMessageService);
  const portalMessage = await messages.createMessage({
    messageReference: `${marker}-PORTAL-MSG`,
    channelType: CommunicationChannelType.PORTAL,
    subject: 'Portal decision notice',
    body: 'Please acknowledge receipt of this official notice.',
    caseId: phase11.caseId,
    masterAdministrativeFileId: phase11.masterAdministrativeFileId,
    recipients: [
      {
        recipientType: 'APPLICANT',
        recipientReference: phase11.applicantIdentityId,
        recipientIdentityId: phase11.applicantIdentityId,
      },
    ],
  });

  await messages.approveMessage(portalMessage.id);

  await prisma.communicationMessage.update({
    where: { id: portalMessage.id },
    data: { status: CommunicationMessageStatus.DELIVERED },
  });

  await prisma.communicationDelivery.create({
    data: {
      communicationMessageId: portalMessage.id,
      channelType: CommunicationChannelType.PORTAL,
      status: CommunicationDeliveryStatus.DELIVERED,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const { invoice } = await calculateAndInvoiceFees(app, phase11);

  return {
    ...phase11,
    governmentDecisionId,
    applicationId: caseRecord.applicationId,
    accessibleDocumentId: accessibleDoc.recordId,
    restrictedDocumentId: restrictedVersion.documentRecordId,
    activeInstrumentId: activeIssue.instrument.id,
    revokedInstrumentId: revokedIssue.instrument.id,
    expiredInstrumentId: expiredIssue.instrument.id,
    portalMessageId: portalMessage.id,
    invoiceId: invoice.id,
  };
}

export async function createOtherCitizenSession(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<{ identityId: string; sessionToken: string }> {
  const marker = NON_PRODUCTION_CITIZEN_EXPERIENCE_MARKER;
  const person = await prisma.person.create({
    data: { givenName: 'Other', familyName: 'Citizen' },
  });
  const account = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-other@test.gov`,
      personId: person.id,
      status: 'ACTIVE',
    },
  });
  const identity = await prisma.identity.create({
    data: {
      type: 'INDIVIDUAL',
      displayName: 'Other Citizen',
      userAccountId: account.id,
      personId: person.id,
    },
  });

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: identity.id, type: 'PASSWORD', password: 'OtherCitizen123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: identity.id, type: 'PASSWORD' })
    .expect(201);

  const login = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({ loginIdentifier: `${marker}-other@test.gov`, password: 'OtherCitizen123!' })
        .expect(201)
    ).body,
  );

  return { identityId: identity.id, sessionToken: login.sessionToken };
}

export async function seedRepresentativeCitizenFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<{
  representativeSessionToken: string;
  representativeIdentityId: string;
  organizationId: string;
  orgInstrumentId: string;
}> {
  const base = await seedCitizenExperienceFixture(app, prisma);
  const marker = NON_PRODUCTION_CITIZEN_EXPERIENCE_MARKER;

  const organization = await prisma.organization.create({
    data: {
      code: `${marker}-ORG`,
      name: 'Represented Organization Ltd',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const representativeAuthority = await prisma.representativeAuthority.create({
    data: {
      organizationId: organization.id,
      identityId: base.applicantIdentityId,
      scopeDescription: 'Manage licensing and compliance filings',
      status: RepresentativeAuthorityStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.application.update({
    where: { id: base.applicationId },
    data: {
      organizationId: organization.id,
      representativeAuthorityId: representativeAuthority.id,
      applicantCategory: 'AUTHORIZED_REPRESENTATIVE',
    },
  });

  const issuance = app.get(IssuanceService);
  const orgIssue = await issuance.issue({
    governmentDecisionId: base.governmentDecisionId,
    instrumentTypeVersionId: base.instrumentTypeVersionId,
    caseId: base.caseId,
    issuerIdentityId: base.officialIdentityId,
    issuerOfficeholderId: base.officialOfficeholderId,
    issuerOfficeId: base.officeId,
    issuerAppointmentId: base.appointmentId,
    holderOrganizationId: organization.id,
    sealDocumentVersionId: base.sealDocumentVersionId,
    scope: { summary: 'Organization-held permit' },
    effectiveFrom: new Date('2026-01-01'),
    effectiveUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    freeFormFields: { holderName: organization.name },
    idempotencyKey: `${marker}-org-instrument`,
  });

  return {
    representativeSessionToken: base.applicantSessionToken,
    representativeIdentityId: base.applicantIdentityId,
    organizationId: organization.id,
    orgInstrumentId: orgIssue.instrument.id,
  };
}
