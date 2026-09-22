import { type INestApplication } from '@nestjs/common';
import { OrganizationStatus, TradeShipmentDirection } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { TradeOrganizationProfileService } from '../src/customs-trade/profile/trade-organization-profile.service';
import { PrismaService } from '../src/database/prisma.service';
import { CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/customs-trade-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Customs & Trade service pack and experience (integration)', () => {
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

  it('validates the customs trade service pack manifest', () => {
    const result = validateServicePackManifest(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(CUSTOMS_TRADE_SERVICE_PACK_TEMPLATE.services).toHaveLength(16);
  });

  it('exposes business trade home for registered trade profile', async () => {
    const member = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'trade-member@test.local',
      password: 'TradeMember123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-TRADE-TEST',
        name: 'Trade Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-TRADE-1', name: 'Trade Org', status: OrganizationStatus.ACTIVE },
    });

    await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        identityId: member.identityId,
        status: 'ACTIVE',
        roleLabel: 'Owner',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const profiles = app.get(TradeOrganizationProfileService);
    await profiles.ensureProfile({
      organizationId: organization.id,
      jurisdictionId: jurisdiction.id,
    });

    const home = (
      await request(app.getHttpServer())
        .get(`/api/v1/experience/business/organizations/${organization.id}/trade`)
        .set('Authorization', `Bearer ${member.sessionToken}`)
        .expect(200)
    ).body as { ruleEnvironment: string; tradeProfileReference: string };

    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
    expect(home.tradeProfileReference).toMatch(/^TRADE-/);
  });

  it('denies business trade access without organization relationship', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'trade-outsider@test.local',
      password: 'TradeOutsider123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-TRADE-2', name: 'Trade Org 2', status: OrganizationStatus.ACTIVE },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/trade`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });

  it('denies broker access to shipment outside representative scope', async () => {
    const broker = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'trade-broker@test.local',
      password: 'TradeBroker123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-TRADE-BROKER',
        name: 'Trade Broker Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const organization = await prisma.organization.create({
      data: {
        code: 'ORG-TRADE-BROKER',
        name: 'Broker Client Org',
        status: OrganizationStatus.ACTIVE,
      },
    });

    const authority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: broker.identityId,
        scopeDescription: 'Customs broker — scoped shipments only',
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const profiles = app.get(TradeOrganizationProfileService);
    const profile = await profiles.ensureProfile({
      organizationId: organization.id,
      jurisdictionId: jurisdiction.id,
    });

    await prisma.tradeShipment.create({
      data: {
        organizationId: organization.id,
        tradeOrganizationProfileId: profile.id,
        shipmentReference: 'SHIP-OUT-OF-SCOPE',
        direction: TradeShipmentDirection.IMPORT,
        status: 'ACTIVE',
      },
    });

    const scopedShipment = await prisma.tradeShipment.create({
      data: {
        organizationId: organization.id,
        tradeOrganizationProfileId: profile.id,
        representativeAuthorityId: authority.id,
        shipmentReference: 'SHIP-IN-SCOPE',
        direction: TradeShipmentDirection.IMPORT,
        status: 'ACTIVE',
      },
    });

    const list = (
      await request(app.getHttpServer())
        .get(`/api/v1/experience/business/organizations/${organization.id}/trade/shipments`)
        .set('Authorization', `Bearer ${broker.sessionToken}`)
        .expect(200)
    ).body as { items: { id: string }[] };

    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.id).toBe(scopedShipment.id);
  });

  it('public verification exposes no confidential trade fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/customs-trade/verify/UNKNOWN-REF')
      .expect(200);

    expect(JSON.stringify(response.body)).not.toContain('organizationId');
    expect(JSON.stringify(response.body)).not.toContain('declarationData');
  });
});
