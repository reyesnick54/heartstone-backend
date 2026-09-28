import { createHmac } from 'node:crypto';

import { type ConfigService } from '@nestjs/config';
import {
  AbsezZoneEnterpriseActorPersona,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  MetricCalculationMethodType,
  PaymentWebhookProcessingStatus,
  ServiceActivationOutcome,
} from '@prisma/client';

import { AbsezBoundaryService } from '../../absez/common/absez-boundary.service';
import { MetricCalculationRunService } from '../../intelligence/calculations/metric-calculation-run.service';
import { IntelligenceBoundaryService } from '../../intelligence/common/intelligence-boundary.service';
import { OperationalSupportBoundaryService } from '../../operational-support/common/operational-support-boundary.service';
import { TestEmailAdapter } from '../../operational-support/communications/adapters/test-email.adapter';
import { TestSmsAdapter } from '../../operational-support/communications/adapters/test-sms.adapter';
import { TestPaymentProviderAdapter } from '../../operational-support/financial/adapters/test-payment-provider.adapter';
import { type PaymentTransactionService } from '../../operational-support/financial/payment-transaction.service';
import { PaymentWebhookService } from '../../operational-support/financial/payment-webhook.service';
import { IntegrationGatewayService } from '../../operational-support/integrations/integration-gateway.service';
import { ServiceRuntimeGateService } from './activation/service-runtime-gate.service';
import { IntegrationCredentialResolverService } from './integrations/integration-credential-resolver.service';
import { OperationalDurableRetryService } from './integrations/operational-durable-retry.service';
import { TraceCorrelationService } from './observability/trace-correlation.service';
import {
  HttpEmailProviderAdapter,
  HttpSmsProviderAdapter,
} from './providers/http-notification-provider.adapter';
import { OperationalProvidersProductionGateService } from './providers/operational-providers-production-gate.service';
import { ComputedMetricService } from './reporting/computed-metric.service';
import { ExecutiveReportScopeService } from './reporting/executive-report-scope.service';
import { S19_REASON_CODES } from './s19.constants';

describe('S19 integrations, reporting, and activation gates', () => {
  const boundary = new OperationalSupportBoundaryService();

  describe('payment webhook security and trust boundary', () => {
    const paymentProvider = new TestPaymentProviderAdapter();
    const paymentTransaction = {
      settlePayment: jest.fn(),
    };
    const prisma = {
      paymentProviderConfiguration: { findUnique: jest.fn() },
      paymentProviderWebhookEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      paymentIntent: { findUnique: jest.fn(), update: jest.fn() },
    };

    const service = new PaymentWebhookService(
      prisma as never,
      boundary,
      paymentTransaction as unknown as PaymentTransactionService,
      paymentProvider,
    );

    const webhookSecret = 'test-webhook-secret';
    const providerConfig = { id: 'provider-1', configuration: { webhookSecret } };

    function signBody(rawBody: string): string {
      return createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    }

    beforeEach(() => {
      jest.clearAllMocks();
      prisma.paymentProviderConfiguration.findUnique.mockResolvedValue(providerConfig);
    });

    it('rejects forged payment callback', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-forged',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'XCD',
        succeeded: true,
        providerTransactionReference: 'prov-forged',
      });

      await expect(
        service.processWebhook({
          paymentProviderConfigurationId: 'provider-1',
          rawBody,
          signature: 'forged',
        }),
      ).rejects.toThrow('WEBHOOK_SIGNATURE_INVALID');
    });

    it('treats duplicate callback as idempotent', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-dup-s19',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'XCD',
        succeeded: true,
        providerTransactionReference: 'prov-dup-s19',
      });

      prisma.paymentProviderWebhookEvent.findUnique.mockResolvedValue({
        id: 'event-1',
        processingStatus: PaymentWebhookProcessingStatus.PROCESSED,
      });

      const result = await service.processWebhook({
        paymentProviderConfigurationId: 'provider-1',
        rawBody,
        signature: signBody(rawBody),
      });

      expect(result.idempotent).toBe(true);
    });

    it('does not allow payment to approve an application', () => {
      expect(() => {
        boundary.assertPaymentDoesNotConstituteApproval('payment recorded; approval granted');
      }).toThrow('PAYMENT_NOT_APPROVAL');
    });

    it('does not allow payment to issue a licence', () => {
      const absezBoundary = new AbsezBoundaryService({} as never);
      expect(() => {
        absezBoundary.assertPaymentDoesNotIssueLicence(
          AbsezZoneEnterpriseActorPersona.PAYMENT_SYSTEM,
        );
      }).toThrow('Payment receipt does not approve or issue an SEZ business licence');
    });
  });

  describe('provider ports', () => {
    it('sends email through provider port', async () => {
      const adapter = new TestEmailAdapter();
      const result = await adapter.dispatch({
        deliveryId: 'delivery-1',
        attemptId: 'attempt-1',
        messageId: 'message-1',
        channel: adapter.channel,
        destinationReference: 'citizen@example.gov',
        subject: 'Notice',
        body: 'Body',
        mandatoryDelivery: false,
      });
      expect(result.providerReference).toContain('test-email:');
    });

    it('sends SMS through provider port', async () => {
      const adapter = new TestSmsAdapter();
      const result = await adapter.dispatch({
        deliveryId: 'delivery-2',
        attemptId: 'attempt-2',
        messageId: 'message-2',
        channel: adapter.channel,
        destinationReference: '+12685550000',
        subject: '',
        body: 'SMS body',
        mandatoryDelivery: false,
      });
      expect(result.providerReference).toContain('test-sms:');
    });
  });

  describe('durable retries and integration authentication', () => {
    it('enqueues safe communication delivery retries', async () => {
      const prisma = {
        workflowDurableJob: {
          create: jest.fn().mockResolvedValue({ id: 'job-1' }),
          findUnique: jest.fn(),
        },
      };
      const retryService = new OperationalDurableRetryService(prisma as never);
      await retryService.enqueueCommunicationDeliveryRetry({
        deliveryId: 'delivery-1',
        attemptNumber: 1,
      });
      expect(prisma.workflowDurableJob.create).toHaveBeenCalled();
    });

    it('resolves authenticated integration configuration headers', async () => {
      const prisma = {
        integrationCredentialReference: {
          findFirst: jest.fn().mockResolvedValue({
            credentialAlias: 'primary',
            vaultReference: 'cred-ref-1',
          }),
        },
      };
      const configService = {
        getOrThrow: () => ({
          integrationCredentialVaultPrefix: 'vault://integration/',
        }),
      };
      const resolver = new IntegrationCredentialResolverService(
        prisma as never,
        configService as unknown as ConfigService,
      );
      const resolved = await resolver.resolveForEndpoint('def-1', 'BEARER');
      expect(resolved?.headers.authorization).toContain('vault://integration/cred-ref-1');
    });

    it('replays completed integration exchanges without duplicate mutation', async () => {
      const prisma = {
        integrationDefinition: { findFirst: jest.fn() },
        integrationRequest: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'req-1',
            status: 'COMPLETED',
            requestReference: 'ref-1',
            exchanges: [{ id: 'ex-1', externalReference: 'ext-1' }],
          }),
          create: jest.fn(),
        },
        integrationEndpoint: { findUnique: jest.fn() },
      };
      const outage = { assertExchangeAllowed: jest.fn(), recordSuccessfulExchange: jest.fn() };
      const gateway = new IntegrationGatewayService(
        prisma as never,
        outage as never,
        { resolveForEndpoint: jest.fn() } as never,
        { enqueueIntegrationExchangeRetry: jest.fn() } as never,
      );

      const result = await gateway.executeAuthorizedExchange({
        integrationVersionId: 'version-1',
        endpointCode: 'QUERY',
        requestReference: 'ref-1',
        payload: { identifier: '123' },
      });

      expect(result.responsePayload.idempotentReplay).toBe(true);
      expect(prisma.integrationRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('computed KPIs and Appendix G reporting', () => {
    it('derives KPI totals from source records', async () => {
      const prisma = {
        metricDefinition: {
          findFirst: jest.fn().mockResolvedValue({
            calculationMethod: MetricCalculationMethodType.DETERMINISTIC_RULE,
          }),
        },
        applicationSubmission: {
          findMany: jest.fn().mockResolvedValue([{ id: 'sub-1' }, { id: 'sub-2' }]),
        },
      };
      const service = new ComputedMetricService(prisma as never);
      const result = await service.compute({
        institutionId: 'inst-1',
        metricCode: 'APPLICATIONS_RECEIVED',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });
      expect(result?.value).toBe('2');
      expect(result?.inputRecordReferences).toEqual(['sub-1', 'sub-2']);
    });

    it('rejects authoritative KPI totals for computed metrics', async () => {
      const prisma = {
        metricDefinitionVersion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'version-1',
            status: 'ACTIVE',
            metricDefinition: {
              ownerInstitutionId: 'inst-1',
              code: 'APPLICATIONS_RECEIVED',
              calculationMethod: MetricCalculationMethodType.DETERMINISTIC_RULE,
            },
          }),
        },
        metricCalculationRun: { create: jest.fn() },
      };
      const computed = {
        compute: jest.fn().mockResolvedValue({
          value: '3',
          inputCount: 3,
          inputRecordReferences: [],
          calculationTrace: { source: 'applications' },
        }),
      };
      const service = new MetricCalculationRunService(
        prisma as never,
        new IntelligenceBoundaryService(),
        computed as never,
      );

      await expect(
        service.recordRun(
          {
            metricVersionId: 'version-1',
            periodStart: new Date('2026-01-01'),
            periodEnd: new Date('2026-01-31'),
            inputCount: 1,
            calculationTrace: { manual: true },
            resultValue: '99',
          },
          'test',
        ),
      ).rejects.toThrow(S19_REASON_CODES.AUTHORITATIVE_KPI_SUBMISSION_FORBIDDEN);
    });

    it('scopes Appendix G report to institution', () => {
      const scope = new ExecutiveReportScopeService();
      expect(() => {
        scope.assertInstitutionScope({
          targetInstitutionId: 'inst-b',
          actorInstitutionIds: ['inst-a'],
        });
      }).toThrow(S19_REASON_CODES.EXECUTIVE_REPORT_CROSS_INSTITUTION_DENIED);
    });
  });

  describe('activation and suspension gates', () => {
    const prisma = {
      governmentServiceVersion: { findUnique: jest.fn() },
      case: { findUnique: jest.fn() },
    };
    const configService = { get: () => ({ nodeEnv: 'test' }) };
    const gate = new ServiceRuntimeGateService(prisma as never, configService as never);

    it('refuses new intake for suspended services', async () => {
      prisma.governmentServiceVersion.findUnique.mockResolvedValue({
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
        activationRecords: [
          { outcome: ServiceActivationOutcome.ACTIVATED, activationBasis: 'pilot acceptance' },
        ],
      });

      await expect(gate.assertIntakeAllowed('version-1')).rejects.toThrow(
        S19_REASON_CODES.SERVICE_INTAKE_BLOCKED,
      );
    });

    it('blocks issuance for suspended services', async () => {
      prisma.case.findUnique.mockResolvedValue({
        id: 'case-1',
        governmentServiceVersion: {
          maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
          publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
        },
      });

      await expect(gate.assertIssuanceAllowed('case-1')).rejects.toThrow(
        S19_REASON_CODES.SERVICE_ISSUANCE_BLOCKED,
      );
    });

    it('preserves prior historical records when suspended', async () => {
      prisma.case.findUnique.mockResolvedValue({
        id: 'case-1',
        status: 'CLOSED',
        governmentServiceVersion: {
          maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
          publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
        },
      });

      await expect(gate.assertIssuanceAllowed('case-1')).rejects.toThrow(
        S19_REASON_CODES.SERVICE_ISSUANCE_BLOCKED,
      );
      expect(prisma.case.findUnique).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        include: { governmentServiceVersion: true },
      });
    });
  });

  describe('tracing and production readiness', () => {
    it('correlates spans across workflow components', () => {
      const tracing = new TraceCorrelationService();
      const trail = tracing.runWithCorrelation('corr-s19', () => {
        tracing.startSpan('api');
        tracing.startSpan('workflow');
        tracing.startSpan('integration');
        return tracing.getSpanTrail();
      });
      expect(trail).toEqual(['api', 'workflow', 'integration']);
    });

    it('fails production readiness when test payment provider is active', () => {
      const configService = {
        get: () => ({ nodeEnv: 'production' }),
        getOrThrow: () => ({
          paymentProvider: 'test',
          emailProvider: 'test',
          smsProvider: 'test',
        }),
      };

      const gate = new OperationalProvidersProductionGateService(
        configService as unknown as ConfigService,
        new TestPaymentProviderAdapter(),
        new TestPaymentProviderAdapter(),
        new TestEmailAdapter(),
        new TestSmsAdapter(),
        new HttpEmailProviderAdapter(configService as unknown as ConfigService),
        new HttpSmsProviderAdapter(configService as unknown as ConfigService),
      );

      const evaluation = gate.evaluateProhibitedAdapters();
      expect(evaluation.allowed).toBe(false);
    });
  });
});
