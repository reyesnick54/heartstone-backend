import { type INestApplication } from '@nestjs/common';
import {
  PropertyInterestKind,
  PropertyInterestStatus,
  PropertyParcelStatus,
  PropertyTransferDecisionOutcome,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { PropertyTransferService } from '../src/property-registry/transfers/property-transfer.service';
import { PROPERTY_LAND_REGISTRY_TEMPLATE } from '../src/service-catalog/service-packs/property-land-registry.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Land & Property Registry service pack and experience (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates the property service pack manifest with fourteen NON_PRODUCTION services', () => {
    const result = validateServicePackManifest(PROPERTY_LAND_REGISTRY_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(PROPERTY_LAND_REGISTRY_TEMPLATE.services).toHaveLength(14);
    expect(PROPERTY_LAND_REGISTRY_TEMPLATE.packLabel).toBe('NON_PRODUCTION');
  });

  it('denies citizen property home data for unrelated parcels', async () => {
    const owner = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'prop-owner@test.local',
      password: 'PropOwner123!',
    });
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'prop-outsider@test.local',
      password: 'PropOutsider123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PROP',
        name: 'Property Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const parcel = await prisma.propertyParcel.create({
      data: {
        jurisdictionId: jurisdiction.id,
        parcelReference: 'PARCEL-TEST-001',
        status: PropertyParcelStatus.REGISTERED,
        publicVerificationReference: 'PUB-PARCEL-001',
      },
    });

    await prisma.propertyInterest.create({
      data: {
        parcelId: parcel.id,
        interestKind: PropertyInterestKind.OWNER,
        status: PropertyInterestStatus.ACTIVE,
        identityId: owner.identityId,
      },
    });

    const ownerHome = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/property')
        .set('Authorization', `Bearer ${owner.sessionToken}`)
        .expect(200)
    ).body as { parcelCount: number };

    const outsiderHome = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/property')
        .set('Authorization', `Bearer ${outsider.sessionToken}`)
        .expect(200)
    ).body as { parcelCount: number };

    expect(ownerHome.parcelCount).toBe(1);
    expect(outsiderHome.parcelCount).toBe(0);
  });

  it('preserves historical ownership through authorized transfer decision flow', async () => {
    const owner = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'prop-transfer-owner@test.local',
      password: 'PropTransfer123!',
    });
    const buyer = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'prop-transfer-buyer@test.local',
      password: 'PropTransfer123!',
    });
    const officer = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'prop-officer@test.local',
      password: 'PropTransfer123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PROP-TR',
        name: 'Property Transfer Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const parcel = await prisma.propertyParcel.create({
      data: {
        jurisdictionId: jurisdiction.id,
        parcelReference: 'PARCEL-TR-001',
        status: PropertyParcelStatus.REGISTERED,
        registryVersion: 1,
      },
    });

    await prisma.propertyInterest.create({
      data: {
        parcelId: parcel.id,
        interestKind: PropertyInterestKind.OWNER,
        status: PropertyInterestStatus.ACTIVE,
        identityId: owner.identityId,
      },
    });

    const transfers = app.get(PropertyTransferService);
    const application = await transfers.submitTransferApplication({
      parcelId: parcel.id,
      applicantIdentityId: owner.identityId,
    });
    await transfers.recordTransferDecision({
      applicationId: application.id,
      outcome: PropertyTransferDecisionOutcome.APPROVED,
      decidedByIdentityId: officer.identityId,
    });
    await transfers.registerTransferAfterDecision({
      applicationId: application.id,
      newOwnerIdentityId: buyer.identityId,
      decidedByIdentityId: officer.identityId,
    });

    const historyCount = await prisma.propertyOwnershipHistory.count({
      where: { parcelId: parcel.id },
    });
    const updatedParcel = await prisma.propertyParcel.findUniqueOrThrow({
      where: { id: parcel.id },
    });
    expect(historyCount).toBeGreaterThan(0);
    expect(updatedParcel.registryVersion).toBe(2);
  });
});
