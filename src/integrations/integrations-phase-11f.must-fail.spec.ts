import { createHmac } from 'node:crypto';

import { ForbiddenException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  CredentialStatus,
  IdentityType,
  IntegrationDataClassification,
  IntegrationExchangeStatus,
  IntegrationLifecycleStatus,
  IntegrationOperation,
  IntegrationWebhookProcessingStatus,
} from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { EvidenceRecordsModule } from '../evidence-records/evidence-records.module';
import { IntegrationBoundaryService } from './common/integration-boundary.service';
import { buildIntegrationLogContext } from './common/integration-logging.util';
import { IntegrationEvidenceBridgeService } from './evidence/integration-evidence-bridge.service';
import { IntegrationGatewayService } from './gateway/integration-gateway.service';
import { IntegrationWebhookService } from './gateway/integration-webhook.service';
import { INTEGRATIONS_EXPLANATION_CODES, SANDBOX_ADAPTER_TYPE } from './integrations.constants';
import { IntegrationsModule } from './integrations.module';
import { IntegrationAdapterRegistryService } from './registry/integration-adapter-registry.service';

describe('Phase 11F integration gateway must-fail invariants', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let gateway: IntegrationGatewayService;
  let webhook: IntegrationWebhookService;
  let boundary: IntegrationBoundaryService;
  let evidenceBridge: IntegrationEvidenceBridgeService;
  let adapterRegistry: IntegrationAdapterRegistryService;

  let activeVersionId: string;
  let suspendedVersionId: string;
  let inactiveVersionId: string;
  let humanIdentityId: string;
  let serviceIdentityId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
        DatabaseModule,
        EvidenceRecordsModule,
        IntegrationsModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    gateway = moduleRef.get(IntegrationGatewayService);
    webhook = moduleRef.get(IntegrationWebhookService);
    boundary = moduleRef.get(IntegrationBoundaryService);
    evidenceBridge = moduleRef.get(IntegrationEvidenceBridgeService);
    adapterRegistry = moduleRef.get(IntegrationAdapterRegistryService);
  });

  beforeEach(async () => {
    await resetIntegrationData(prisma);
    adapterRegistry.getSandboxAdapter().resetConfig();

    const human = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Human Operator' },
    });
    humanIdentityId = human.id;

    const service = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'Integration Service' },
    });
    serviceIdentityId = service.id;

    await prisma.credential.create({
      data: {
        identityId: serviceIdentityId,
        type: 'API_KEY',
        status: CredentialStatus.ACTIVE,
        apiKeyHash: 'test-hash',
      },
    });

    const integration = await prisma.integration.create({
      data: {
        code: 'sandbox-test',
        name: 'Sandbox Test Integration',
        status: IntegrationLifecycleStatus.ACTIVE,
      },
    });

    const suspendedIntegration = await prisma.integration.create({
      data: {
        code: 'suspended-test',
        name: 'Suspended Integration',
        status: IntegrationLifecycleStatus.SUSPENDED,
      },
    });

    const inactiveIntegration = await prisma.integration.create({
      data: {
        code: 'inactive-test',
        name: 'Inactive Integration',
        status: IntegrationLifecycleStatus.INACTIVE,
      },
    });

    const activeVersion = await createIntegrationVersion(prisma, {
      integrationId: integration.id,
      version: '1.0.0',
      status: IntegrationLifecycleStatus.ACTIVE,
      serviceIdentityId,
    });
    activeVersionId = activeVersion.id;

    const suspendedVersion = await createIntegrationVersion(prisma, {
      integrationId: suspendedIntegration.id,
      version: '1.0.0',
      status: IntegrationLifecycleStatus.SUSPENDED,
      serviceIdentityId,
    });
    suspendedVersionId = suspendedVersion.id;

    const inactiveVersion = await createIntegrationVersion(prisma, {
      integrationId: inactiveIntegration.id,
      version: '1.0.0',
      status: IntegrationLifecycleStatus.INACTIVE,
      serviceIdentityId,
    });
    inactiveVersionId = inactiveVersion.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  const baseRequest = () => ({
    integrationVersionId: activeVersionId,
    operation: IntegrationOperation.QUERY,
    initiatingIdentityId: humanIdentityId,
    institutionalPurpose: 'status-check',
    fields: { referenceId: 'REF-001' },
    permittedFields: ['referenceId'],
    dataClassification: IntegrationDataClassification.OFFICIAL,
    idempotencyKey: `idem-${String(Date.now())}-${String(Math.random())}`,
    schemaRequiredFields: ['referenceId', 'status'],
  });

  it('blocks inactive integration', async () => {
    await expect(
      gateway.executeOutbound({
        ...baseRequest(),
        integrationVersionId: inactiveVersionId,
      }),
    ).rejects.toMatchObject({
      response: { code: INTEGRATIONS_EXPLANATION_CODES.INTEGRATION_NOT_ACTIVE },
    });
  });

  it('blocks inactive credential', async () => {
    await prisma.integrationCredential.updateMany({
      where: { integrationVersionId: activeVersionId },
      data: { status: CredentialStatus.REVOKED },
    });

    await expect(gateway.executeOutbound(baseRequest())).rejects.toMatchObject({
      response: { code: INTEGRATIONS_EXPLANATION_CODES.CREDENTIAL_NOT_ACTIVE },
    });
  });

  it('blocks suspended integration', async () => {
    await expect(
      gateway.executeOutbound({
        ...baseRequest(),
        integrationVersionId: suspendedVersionId,
      }),
    ).rejects.toMatchObject({
      response: { code: INTEGRATIONS_EXPLANATION_CODES.INTEGRATION_SUSPENDED },
    });
  });

  it('blocks wrong operation', async () => {
    await expect(
      gateway.executeOutbound({
        ...baseRequest(),
        operation: IntegrationOperation.UPDATE,
      }),
    ).rejects.toMatchObject({
      response: { code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_PERMITTED },
    });
  });

  it('blocks prohibited field', async () => {
    await expect(
      gateway.executeOutbound({
        ...baseRequest(),
        fields: { referenceId: 'REF-001', secretToken: 'should-not-pass' },
        permittedFields: ['referenceId', 'secretToken'],
      }),
    ).rejects.toMatchObject({
      response: { code: INTEGRATIONS_EXPLANATION_CODES.FIELD_NOT_PERMITTED },
    });
  });

  it('applies minimum-necessary field filtering', async () => {
    const result = await gateway.executeOutbound({
      ...baseRequest(),
      fields: { referenceId: 'REF-001', extraField: 'stripped' },
      permittedFields: ['referenceId'],
    });

    const request = await prisma.integrationRequest.findUnique({
      where: { id: result.requestId },
    });
    expect(request?.payloadMinimized).toEqual({ referenceId: 'REF-001' });
    expect(request?.payloadMinimized).not.toHaveProperty('extraField');
  });

  it('prevents service credential from creating authority', async () => {
    await expect(
      boundary.rejectServiceIdentityAuthorityClaims(serviceIdentityId, {
        approved: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not treat HTTP 200 as validated record', async () => {
    adapterRegistry.getSandboxAdapter().setConfig({ simulateHttp200InvalidSchema: true });

    const result = await gateway.executeOutbound(baseRequest());
    expect(result.isValidated).toBe(false);
    expect(result.status).not.toBe(IntegrationExchangeStatus.VALIDATED);

    const responseRecord = await prisma.integrationResponseRecord.findFirst({
      where: { exchangeId: result.exchangeId },
    });
    expect(responseRecord?.httpStatusCode).toBe(200);
    expect(responseRecord?.isValidated).toBe(false);
  });

  it('rejects invalid webhook signature', async () => {
    const result = await webhook.processWebhook({
      integrationVersionId: activeVersionId,
      externalEventId: 'evt-invalid-sig',
      eventType: 'status.update',
      payload: { status: 'updated' },
      signature: 'invalid',
      signingSecret: 'test-secret',
    });

    expect(result.processed).toBe(false);
    expect(result.webhookEvent.processingStatus).toBe(
      IntegrationWebhookProcessingStatus.REJECTED_INVALID_SIGNATURE,
    );
  });

  it('rejects webhook replay', async () => {
    const payload = { status: 'updated', referenceId: 'REF-REPLAY' };
    const signingSecret = 'replay-secret';
    const signature = createHmac('sha256', signingSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const first = await webhook.processWebhook({
      integrationVersionId: activeVersionId,
      externalEventId: 'evt-replay-1',
      eventType: 'status.update',
      payload,
      signature,
      signingSecret,
      acceptedEventTypes: ['status.update'],
      schemaRequiredFields: ['status', 'referenceId'],
    });
    expect(first.processed).toBe(true);

    const replay = await webhook.processWebhook({
      integrationVersionId: activeVersionId,
      externalEventId: 'evt-replay-2',
      eventType: 'status.update',
      payload,
      signature,
      signingSecret,
      acceptedEventTypes: ['status.update'],
      schemaRequiredFields: ['status', 'referenceId'],
    });
    expect(replay.processed).toBe(false);
    expect(replay.webhookEvent.processingStatus).toBe(
      IntegrationWebhookProcessingStatus.REJECTED_REPLAY,
    );
  });

  it('rejects duplicate outbound operation via idempotency', async () => {
    const idempotencyKey = 'duplicate-operation-key';
    const first = await gateway.executeOutbound({
      ...baseRequest(),
      idempotencyKey,
    });
    const second = await gateway.executeOutbound({
      ...baseRequest(),
      idempotencyKey,
    });

    expect(first.isDuplicate).toBe(false);
    expect(second.isDuplicate).toBe(true);
    expect(second.requestId).toBe(first.requestId);
  });

  it('preserves mapping version on transformation', async () => {
    const result = await gateway.executeOutbound({
      ...baseRequest(),
      fieldMapping: { status: 'internalStatus', referenceId: 'internalReference' },
      mappingVersion: 'map-v2.1',
      transformationVersion: 'transform-v1.0',
    });

    const transformation = await prisma.integrationDataTransformation.findFirst({
      where: { exchangeId: result.exchangeId },
    });
    expect(transformation?.mappingVersion).toBe('map-v2.1');
    expect(transformation?.transformationVersion).toBe('transform-v1.0');
  });

  it('discloses lossy transformation fields', async () => {
    adapterRegistry.getSandboxAdapter().setConfig({
      responseData: { status: 'ok', referenceId: 'REF-001', droppedField: 'gone' },
    });

    const result = await gateway.executeOutbound({
      ...baseRequest(),
      fieldMapping: { status: 'internalStatus' },
      mappingVersion: 'map-v1',
      transformationVersion: 'transform-v1',
    });

    const transformation = await prisma.integrationDataTransformation.findFirst({
      where: { exchangeId: result.exchangeId },
    });
    expect(transformation?.lossyFields).toContain('referenceId');
    expect(result.transformationWarnings.length).toBeGreaterThan(0);
  });

  it('does not invent missing external fields', async () => {
    adapterRegistry.getSandboxAdapter().setConfig({
      responseData: { status: 'ok' },
    });

    const result = await gateway.executeOutbound({
      ...baseRequest(),
      schemaRequiredFields: ['referenceId', 'status'],
    });

    expect(result.missingFields).toContain('referenceId');
    expect(result.isValidated).toBe(false);
  });

  it('does not imply negative finding on timeout', async () => {
    adapterRegistry.getSandboxAdapter().setConfig({ simulateTimeout: true });

    const result = await gateway.executeOutbound(baseRequest());
    expect(result.status).toBe(IntegrationExchangeStatus.TIMED_OUT);
    expect(result.isValidated).toBe(false);

    expect(() => { boundary.assertTimeoutDoesNotImplyNegativeFinding({ negativeFinding: true }); },
    ).toThrow();
  });

  it('does not approve or refuse case on external failure', async () => {
    adapterRegistry.getSandboxAdapter().setConfig({ simulateFailure: true });

    const result = await gateway.executeOutbound(baseRequest());
    expect(result.status).toBe(IntegrationExchangeStatus.FAILED);
    expect(result.isValidated).toBe(false);

    expect(() => { boundary.assertExternalFailureDoesNotImplyDecision({ approved: true }); },
    ).toThrow();
  });

  it('redacts payload secrets from log context', () => {
    const context = buildIntegrationLogContext({
      correlationId: 'corr-1',
      apiKey: 'super-secret-api-key-value-here',
      token: 'Bearer abc.def.ghi',
    });
    expect(context.apiKey).toBe('[REDACTED]');
    expect(context.token).toBe('[REDACTED]');
    expect(context.correlationId).toBe('corr-1');
  });

  it('registers official external evidence in Phase 7 document architecture', async () => {
    const result = await gateway.executeOutbound(baseRequest());

    const evidence = await evidenceBridge.registerOfficialExternalEvidence({
      exchangeId: result.exchangeId,
      title: 'External Integration Response',
      documentType: 'integration-response',
      structuredSummary: result.structuredSummary,
      contentHash: 'abc123hash',
      receivedByIdentityId: humanIdentityId,
    });

    expect(evidence.documentRecord.id).toBeDefined();
    expect(evidence.version.id).toBeDefined();

    const exchange = await prisma.integrationExchange.findUnique({
      where: { id: result.exchangeId },
    });
    expect(exchange?.documentRecordId).toBe(evidence.documentRecord.id);
  });

  it('rejects invalid webhook schema', async () => {
    const result = await webhook.processWebhook({
      integrationVersionId: activeVersionId,
      externalEventId: 'evt-bad-schema',
      eventType: 'status.update',
      payload: { incomplete: true },
      acceptedEventTypes: ['status.update'],
      schemaRequiredFields: ['status', 'referenceId'],
    });

    expect(result.processed).toBe(false);
    expect(result.webhookEvent.processingStatus).toBe(
      IntegrationWebhookProcessingStatus.REJECTED_INVALID_SCHEMA,
    );
  });

  it('rejects duplicate webhook external event id', async () => {
    const payload = { status: 'ok', referenceId: 'REF-DUP' };
    const first = await webhook.processWebhook({
      integrationVersionId: activeVersionId,
      externalEventId: 'evt-duplicate-id',
      eventType: 'status.update',
      payload,
      acceptedEventTypes: ['status.update'],
      schemaRequiredFields: ['status', 'referenceId'],
    });
    expect(first.processed).toBe(true);

    const second = await webhook.processWebhook({
      integrationVersionId: activeVersionId,
      externalEventId: 'evt-duplicate-id',
      eventType: 'status.update',
      payload,
      acceptedEventTypes: ['status.update'],
      schemaRequiredFields: ['status', 'referenceId'],
    });
    expect(second.processed).toBe(false);
    expect(second.webhookEvent.id).toBe(first.webhookEvent.id);

    const eventCount = await prisma.integrationWebhookEvent.count({
      where: {
        integrationVersionId: activeVersionId,
        externalEventId: 'evt-duplicate-id',
      },
    });
    expect(eventCount).toBe(1);
  });
});

async function createIntegrationVersion(
  prisma: PrismaService,
  params: {
    integrationId: string;
    version: string;
    status: IntegrationLifecycleStatus;
    serviceIdentityId: string;
  },
) {
  const version = await prisma.integrationVersion.create({
    data: {
      integrationId: params.integrationId,
      version: params.version,
      status: params.status,
      adapterType: SANDBOX_ADAPTER_TYPE,
      serviceIdentityId: params.serviceIdentityId,
      requestSchemaVersion: '1.0',
      permittedOperations: [IntegrationOperation.QUERY, IntegrationOperation.SUBMIT],
      permittedPurposes: ['status-check', 'submission'],
      permittedFields: {
        QUERY: ['referenceId'],
        SUBMIT: ['referenceId', 'submissionData'],
      },
      capabilityDeclarations: {
        supportsIdempotency: true,
        supportsWrite: true,
      },
      schemaDefinition: {
        acceptedEventTypes: ['status.update', 'acknowledgment'],
      },
    },
  });

  await prisma.integrationCredential.create({
    data: {
      integrationVersionId: version.id,
      identityId: params.serviceIdentityId,
      credentialReference: 'cred-ref-test',
      status: CredentialStatus.ACTIVE,
    },
  });

  return version;
}

async function resetIntegrationData(prisma: PrismaService) {
  await prisma.integrationValidationResult.deleteMany();
  await prisma.integrationDataTransformation.deleteMany();
  await prisma.integrationCorrelationRecord.deleteMany();
  await prisma.integrationDeliveryAttempt.deleteMany();
  await prisma.integrationMessage.deleteMany();
  await prisma.integrationResponseRecord.deleteMany();
  await prisma.integrationWebhookEvent.deleteMany();
  await prisma.integrationExchange.deleteMany();
  await prisma.integrationRequest.deleteMany();
  await prisma.integrationCredential.deleteMany();
  await prisma.integrationVersion.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.identity.deleteMany();
}
