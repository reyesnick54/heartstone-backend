import { createHmac } from 'node:crypto';

import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  IntegrationExchangeDirection,
  IntegrationExchangeStatus,
  IntegrationLifecycleStatus,
  IntegrationSignatureValidationResult,
  IntegrationValidationOverallStatus,
  IntegrationWebhookProcessingStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashIntegrationPayload } from '../common/integration-hash.util';
import {
  DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS,
  INTEGRATIONS_EXPLANATION_CODES,
} from '../integrations.constants';
import { IntegrationAdapterRegistryService } from '../registry/integration-adapter-registry.service';

export interface ProcessWebhookInput {
  integrationVersionId: string;
  externalEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signature?: string;
  timestamp?: string;
  signingSecret?: string;
  acceptedEventTypes?: string[];
  schemaRequiredFields?: string[];
}

@Injectable()
export class IntegrationWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: IntegrationAdapterRegistryService,
  ) {}

  async processWebhook(input: ProcessWebhookInput) {
    const version = await this.prisma.integrationVersion.findUnique({
      where: { id: input.integrationVersionId },
      include: { integration: true },
    });

    if (version?.status !== IntegrationLifecycleStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Integration is not active',
        code: INTEGRATIONS_EXPLANATION_CODES.INTEGRATION_NOT_ACTIVE,
      });
    }

    const existing = await this.prisma.integrationWebhookEvent.findUnique({
      where: {
        integrationVersionId_externalEventId: {
          integrationVersionId: input.integrationVersionId,
          externalEventId: input.externalEventId,
        },
      },
    });

    if (existing) {
      return {
        webhookEvent: existing,
        processed: false,
        rejectionReason: 'Duplicate external event',
      };
    }

    const signatureResult = this.validateSignature(
      input.payload,
      input.signature,
      input.signingSecret,
    );
    if (signatureResult === IntegrationSignatureValidationResult.INVALID) {
      return this.rejectWebhook(
        input,
        IntegrationWebhookProcessingStatus.REJECTED_INVALID_SIGNATURE,
        'Invalid signature',
      );
    }

    const timestampValid = this.validateTimestamp(input.timestamp);
    if (!timestampValid) {
      return this.rejectWebhook(
        input,
        IntegrationWebhookProcessingStatus.REJECTED_EXPIRED_TIMESTAMP,
        'Expired or invalid timestamp',
      );
    }

    const acceptedTypes =
      input.acceptedEventTypes ??
      (version.schemaDefinition as { acceptedEventTypes?: string[] } | null)?.acceptedEventTypes ??
      [];
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(input.eventType)) {
      return this.rejectWebhook(
        input,
        IntegrationWebhookProcessingStatus.REJECTED_UNEXPECTED_TYPE,
        `Unexpected event type: ${input.eventType}`,
      );
    }

    const schemaRequiredFields = input.schemaRequiredFields ?? [];
    const missingFields = schemaRequiredFields.filter(
      (field) =>
        !(field in input.payload) ||
        input.payload[field] === undefined ||
        input.payload[field] === null,
    );
    if (missingFields.length > 0) {
      return this.rejectWebhook(
        input,
        IntegrationWebhookProcessingStatus.REJECTED_INVALID_SCHEMA,
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    const payloadHash = hashIntegrationPayload(input.payload);
    const replayValid = await this.validateReplay(input.integrationVersionId, payloadHash);
    if (!replayValid) {
      return this.rejectWebhook(
        input,
        IntegrationWebhookProcessingStatus.REJECTED_REPLAY,
        'Replay detected',
      );
    }

    const adapter = this.adapterRegistry.resolve(version.adapterType);
    if (adapter.receiveEvent) {
      const adapterResult = await adapter.receiveEvent({
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        payload: input.payload,
        signature: input.signature,
        timestamp: input.timestamp,
      });
      if (!adapterResult.success) {
        return this.rejectWebhook(
          input,
          IntegrationWebhookProcessingStatus.SAFE_HALTED,
          adapterResult.errorMessage ?? 'Adapter rejected event',
        );
      }
    }

    const webhookEvent = await this.prisma.integrationWebhookEvent.create({
      data: {
        integrationVersionId: input.integrationVersionId,
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        signatureResult,
        timestampValid,
        replayValid,
        payloadHash,
        processingStatus: IntegrationWebhookProcessingStatus.PROCESSED,
      },
    });

    const exchange = await this.prisma.integrationExchange.create({
      data: {
        direction: IntegrationExchangeDirection.INBOUND,
        integrationVersionId: input.integrationVersionId,
        externalSystem: version.adapterType,
        status: IntegrationExchangeStatus.ACKNOWLEDGED,
        correlationId: input.externalEventId,
        requestHash: payloadHash,
        responseHash: payloadHash,
        dataClassification: version.dataClassificationCeiling,
        completedAt: new Date(),
      },
    });

    await this.prisma.integrationValidationResult.create({
      data: {
        exchangeId: exchange.id,
        webhookEventId: webhookEvent.id,
        overallStatus: IntegrationValidationOverallStatus.PASSED,
        checks: {
          signatureValid: signatureResult === IntegrationSignatureValidationResult.VALID,
          timestampValid,
          replayValid,
          schemaValid: true,
        },
        failureReasons: [],
      },
    });

    return { webhookEvent, exchange, processed: true };
  }

  private validateSignature(
    payload: Record<string, unknown>,
    signature?: string,
    signingSecret?: string,
  ): IntegrationSignatureValidationResult {
    if (!signingSecret) {
      return IntegrationSignatureValidationResult.NOT_APPLICABLE;
    }
    if (!signature) {
      return IntegrationSignatureValidationResult.MISSING;
    }
    const expected = createHmac('sha256', signingSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature === expected
      ? IntegrationSignatureValidationResult.VALID
      : IntegrationSignatureValidationResult.INVALID;
  }

  private validateTimestamp(timestamp?: string): boolean {
    if (!timestamp) {
      return true;
    }
    const eventTime = Date.parse(timestamp);
    if (Number.isNaN(eventTime)) {
      return false;
    }
    return Date.now() - eventTime <= DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS;
  }

  private async validateReplay(
    integrationVersionId: string,
    payloadHash: string,
  ): Promise<boolean> {
    const prior = await this.prisma.integrationWebhookEvent.findFirst({
      where: {
        integrationVersionId,
        payloadHash,
        processingStatus: IntegrationWebhookProcessingStatus.PROCESSED,
      },
    });
    return !prior;
  }

  private async rejectWebhook(
    input: ProcessWebhookInput,
    status: IntegrationWebhookProcessingStatus,
    reason: string,
  ) {
    const payloadHash = hashIntegrationPayload(input.payload);
    const webhookEvent = await this.prisma.integrationWebhookEvent.create({
      data: {
        integrationVersionId: input.integrationVersionId,
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        signatureResult: IntegrationSignatureValidationResult.INVALID,
        timestampValid: false,
        replayValid: false,
        payloadHash,
        processingStatus: status,
        rejectionReason: reason,
      },
    });

    await this.prisma.integrationValidationResult.create({
      data: {
        webhookEventId: webhookEvent.id,
        overallStatus: IntegrationValidationOverallStatus.FAILED,
        checks: {},
        failureReasons: [reason],
      },
    });

    return { webhookEvent, processed: false, rejectionReason: reason };
  }
}
