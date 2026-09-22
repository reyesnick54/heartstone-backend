import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import {
  DriverLicenseLifecycleStatus,
  OrganizationStatus,
  VehicleOwnershipPartyType,
  VehicleOwnershipRecordStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/transportation-government-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { VEHICLE_REFERENCE_NUMBER_PREFIX } from '../src/transportation/transportation.constants';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Transportation service pack and experience (integration)', () => {
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

  it('validates the transportation service pack manifest', () => {
    const result = validateServicePackManifest(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(TRANSPORTATION_GOVERNMENT_SERVICE_PACK_TEMPLATE.services).toHaveLength(15);
  });

  it('exposes citizen transportation home for authorized subject vehicle records only', async () => {
    const owner = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'owner-trans@test.local',
      password: 'OwnerTrans123!',
    });
    const other = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'other-trans@test.local',
      password: 'OtherTrans123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-TRANS-TEST',
        name: 'Transport Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const ownerVehicle = await prisma.vehicleRecord.create({
      data: {
        id: randomUUID(),
        vehicleReferenceNumber: `${VEHICLE_REFERENCE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`,
        jurisdictionId: jurisdiction.id,
      },
    });

    await prisma.vehicleOwnershipRecord.create({
      data: {
        id: randomUUID(),
        vehicleRecordId: ownerVehicle.id,
        ownerPartyType: VehicleOwnershipPartyType.IDENTITY,
        ownerIdentityId: owner.identityId,
        isCurrent: true,
        status: VehicleOwnershipRecordStatus.CURRENT,
      },
    });

    const otherVehicle = await prisma.vehicleRecord.create({
      data: {
        id: randomUUID(),
        vehicleReferenceNumber: `${VEHICLE_REFERENCE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`,
        jurisdictionId: jurisdiction.id,
      },
    });

    await prisma.vehicleOwnershipRecord.create({
      data: {
        id: randomUUID(),
        vehicleRecordId: otherVehicle.id,
        ownerPartyType: VehicleOwnershipPartyType.IDENTITY,
        ownerIdentityId: other.identityId,
        isCurrent: true,
        status: VehicleOwnershipRecordStatus.CURRENT,
      },
    });

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/transportation')
        .set('Authorization', `Bearer ${owner.sessionToken}`)
        .expect(200)
    ).body as { vehicles: unknown[]; ruleEnvironment: string };

    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
    expect(home.vehicles).toHaveLength(1);
  });

  it('denies business fleet access without organization relationship', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'outsider-trans@test.local',
      password: 'OutsiderTrans123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-TRANS-1', name: 'Transport Org', status: OrganizationStatus.ACTIVE },
    });

    await prisma.transportOperatorRecord.create({
      data: {
        id: randomUUID(),
        operatorReferenceNumber: `TOPR-${randomUUID().slice(0, 8).toUpperCase()}`,
        operatorOrganizationId: organization.id,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/fleet`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });

  it('represents suspended license on citizen home', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'suspended-trans@test.local',
      password: 'SuspendedTrans123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-TRANS-SUSP',
        name: 'Transport Suspended Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const profile = await prisma.driverProfile.create({
      data: {
        id: randomUUID(),
        profileNumber: `DRVP-${randomUUID().slice(0, 8).toUpperCase()}`,
        subjectIdentityId: citizen.identityId,
        jurisdictionId: jurisdiction.id,
      },
    });

    const license = await prisma.driverLicenseRecord.create({
      data: {
        id: randomUUID(),
        licenseNumber: `DLR-${randomUUID().slice(0, 8).toUpperCase()}`,
        driverProfileId: profile.id,
        lifecycleStatus: DriverLicenseLifecycleStatus.SUSPENDED,
      },
    });

    await prisma.driverProfile.update({
      where: { id: profile.id },
      data: { currentDriverLicenseRecordId: license.id },
    });

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/transportation')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as {
      driverLicense: { lifecycleStatus: string; isSuspended: boolean } | null;
    };

    if (!home.driverLicense) {
      throw new Error('Expected driver license on transportation home');
    }
    expect(home.driverLicense.lifecycleStatus).toBe('SUSPENDED');
    expect(home.driverLicense.isSuspended).toBe(true);
  });
});
