import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CredentialStatus,
  IntegrationDataClassification,
  IntegrationDeliveryAttemptOutcome,
  IntegrationExchangeDirection,
  IntegrationExchangeStatus,
  IntegrationLifecycleStatus,
  IntegrationMessageDirection,
  IntegrationOperation,
  type IntegrationVersion,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationBoundaryService } from '../common/integration-boundary.service';
import { hashIntegrationPayload } from '../common/integration-hash.util';
import { buildIntegrationLogContext } from '../common/integration-logging.util';
import { INTEGRATIONS_EXPLANATION_CODES } from '../integrations.constants';
import { type IntegrationAdapterResponse } from '../ports/integration-adapter.port';
import { IntegrationAdapterRegistryService } from '../registry/integration-adapter-registry.service';
import { IntegrationIdempotencyService } from './integration-idempotency.service';
import { IntegrationTransformationService } from './integration-transformation.service';
import { IntegrationValidationService } from './integration-validation.service';

export interface ExecuteOutboundRequestInput {
  integrationVersionId: string;
  operation: IntegrationOperation;
  initiatingIdentityId: string;
  institutionalPurpose: string;
  fields: Record<string, unknown>;
  permittedFields: string[];
  dataClassification: IntegrationDataClassification;
  correlationId?: string;
  idempotencyKey: string;
  caseId?: string;
  applicationId?: string;
  recordReference?: string;
  schemaRequiredFields?: string[];
  fieldMapping?: Record<string, string>;
  mappingVersion?: string;
  transformationVersion?: string;
  registerAsEvidence?: boolean;
}

export interface ExecuteOutboundRequestResult {
  requestId: string;
  exchangeId: string;
  correlationId: string;
  status: IntegrationExchangeStatus;
  isValidated: boolean;
  isDuplicate: boolean;
  structuredSummary: Record<string, unknown>;
  missingFields: string[];
  transformationWarnings: string[];
}

type IntegrationVersionWithCredential = IntegrationVersion & {
  credential: { status: CredentialStatus } | null;
  integration: { code: string; status: IntegrationLifecycleStatus };
};

@Injectable()
export class IntegrationGatewayService {
  private readonly logger = new Logger(IntegrationGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: IntegrationAdapterRegistryService,
    private readonly boundary: IntegrationBoundaryService,
    private readonly idempotency: IntegrationIdempotencyService,
    private readonly validation: IntegrationValidationService,
    private readonly transformation: IntegrationTransformationService,
  ) {}

  async executeOutbound(input: ExecuteOutboundRequestInput): Promise<ExecuteOutboundRequestResult> {
    const version = await this.loadActiveVersion(input.integrationVersionId);
    await this.boundary.rejectServiceIdentityAuthorityClaims(
      input.initiatingIdentityId,
      input.fields,
    );

    const existing = await this.idempotency.findExistingRequest(
      input.integrationVersionId,
      input.idempotencyKey,
    );
    if (existing) {
      const latestExchange = existing.exchanges[0];
      return {
        requestId: existing.id,
        exchangeId: latestExchange?.id ?? '',
        correlationId: existing.correlationId,
        status: latestExchange?.status ?? IntegrationExchangeStatus.PREPARED,
        isValidated: latestExchange?.status === IntegrationExchangeStatus.VALIDATED,
        isDuplicate: true,
        structuredSummary: existing.payloadMinimized as Record<string, unknown>,
        missingFields: [],
        transformationWarnings: [],
      };
    }

    this.assertPreDispatchGuards(version, input);
    const minimizedPayload = this.applyDataMinimization(input.fields, input.permittedFields);
    const correlationId = input.correlationId ?? randomUUID();
    const payloadHash = hashIntegrationPayload(minimizedPayload);

    const request = await this.prisma.integrationRequest.create({
      data: {
        integrationVersionId: input.integrationVersionId,
        operation: input.operation,
        initiatingIdentityId: input.initiatingIdentityId,
        serviceIdentityId: version.serviceIdentityId,
        institutionalPurpose: input.institutionalPurpose,
        caseId: input.caseId,
        applicationId: input.applicationId,
        recordReference: input.recordReference,
        permittedFields: input.permittedFields,
        requestSchemaVersion: version.requestSchemaVersion,
        correlationId,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        payloadMinimized: minimizedPayload as Prisma.InputJsonValue,
        dataClassification: input.dataClassification,
      },
    });

    const exchange = await this.prisma.integrationExchange.create({
      data: {
        direction: IntegrationExchangeDirection.OUTBOUND,
        integrationVersionId: input.integrationVersionId,
        requestId: request.id,
        externalSystem: version.adapterType,
        status: IntegrationExchangeStatus.PREPARED,
        correlationId,
        requestHash: payloadHash,
        dataClassification: input.dataClassification,
        recordsReference: input.recordReference,
      },
    });

    await this.prisma.integrationCorrelationRecord.create({
      data: {
        correlationId,
        exchangeId: exchange.id,
        requestId: request.id,
      },
    });

    await this.prisma.integrationMessage.create({
      data: {
        exchangeId: exchange.id,
        direction: IntegrationMessageDirection.OUTBOUND,
        messageType: input.operation,
        contentHash: payloadHash,
        structuredSummary: minimizedPayload as Prisma.InputJsonValue,
      },
    });

    const adapter = this.adapterRegistry.resolve(version.adapterType);
    this.assertOperationSupported(adapter, input.operation);

    const attemptNumber = 1;
    const attemptStarted = new Date();

    let adapterResponse: IntegrationAdapterResponse;
    try {
      adapterResponse = await this.dispatchToAdapter(adapter, input.operation, {
        correlationId,
        idempotencyKey: input.idempotencyKey,
        fields: minimizedPayload,
        schemaVersion: version.requestSchemaVersion,
      });
    } catch (error) {
      await this.recordDeliveryAttempt(exchange.id, attemptNumber, {
        outcome: IntegrationDeliveryAttemptOutcome.FAILURE,
        startedAt: attemptStarted,
        errorMessage: error instanceof Error ? error.message : 'dispatch_failed',
      });
      await this.prisma.integrationExchange.update({
        where: { id: exchange.id },
        data: { status: IntegrationExchangeStatus.FAILED, completedAt: new Date() },
      });
      this.boundary.assertExternalFailureDoesNotImplyDecision({});
      throw error;
    }

    if (adapterResponse.timedOut) {
      await this.recordDeliveryAttempt(exchange.id, attemptNumber, {
        outcome: IntegrationDeliveryAttemptOutcome.TIMEOUT,
        startedAt: attemptStarted,
        errorMessage: 'Request timed out',
      });
      await this.prisma.integrationExchange.update({
        where: { id: exchange.id },
        data: { status: IntegrationExchangeStatus.TIMED_OUT, completedAt: new Date() },
      });
      this.boundary.assertTimeoutDoesNotImplyNegativeFinding({});
      return {
        requestId: request.id,
        exchangeId: exchange.id,
        correlationId,
        status: IntegrationExchangeStatus.TIMED_OUT,
        isValidated: false,
        isDuplicate: false,
        structuredSummary: minimizedPayload,
        missingFields: [],
        transformationWarnings: [],
      };
    }

    await this.recordDeliveryAttempt(exchange.id, attemptNumber, {
      outcome: adapterResponse.success
        ? IntegrationDeliveryAttemptOutcome.SUCCESS
        : IntegrationDeliveryAttemptOutcome.FAILURE,
      startedAt: attemptStarted,
      outcomeCode: adapterResponse.errorCode,
      errorMessage: adapterResponse.errorMessage,
    });

    const responseData = adapterResponse.data ?? {};
    const responseHash = hashIntegrationPayload(responseData);

    let transformationWarnings: string[] = [];
    let structuredSummary = responseData;

    if (input.fieldMapping && input.mappingVersion && input.transformationVersion) {
      const transformOutcome = this.transformation.transform({
        exchangeId: exchange.id,
        sourceSchema: version.requestSchemaVersion,
        destinationSchema: 'heartstone-internal',
        mappingVersion: input.mappingVersion,
        transformationVersion: input.transformationVersion,
        input: responseData,
        fieldMapping: input.fieldMapping,
      });
      await this.transformation.recordTransformation(
        {
          exchangeId: exchange.id,
          sourceSchema: version.requestSchemaVersion,
          destinationSchema: 'heartstone-internal',
          mappingVersion: input.mappingVersion,
          transformationVersion: input.transformationVersion,
          input: responseData,
          fieldMapping: input.fieldMapping,
        },
        transformOutcome,
      );
      structuredSummary = transformOutcome.output;
      transformationWarnings = transformOutcome.warnings;
    }

    const schemaRequiredFields = input.schemaRequiredFields ?? [];
    const validationOutcome = this.validation.validateResponse({
      exchangeId: exchange.id,
      adapterResponse,
      expectedSchemaVersion: version.requestSchemaVersion,
      permittedFields: input.permittedFields,
      schemaRequiredFields,
    });

    await this.validation.persistResponseValidation(
      {
        exchangeId: exchange.id,
        adapterResponse,
        expectedSchemaVersion: version.requestSchemaVersion,
        permittedFields: input.permittedFields,
        schemaRequiredFields,
      },
      validationOutcome,
      responseHash,
      structuredSummary,
    );

    await this.prisma.integrationMessage.create({
      data: {
        exchangeId: exchange.id,
        direction: IntegrationMessageDirection.INBOUND,
        messageType: 'response',
        contentHash: responseHash,
        structuredSummary: structuredSummary as Prisma.InputJsonValue,
      },
    });

    const finalStatus = adapterResponse.success
      ? validationOutcome.isValidated
        ? IntegrationExchangeStatus.VALIDATED
        : IntegrationExchangeStatus.RESPONSE_RECEIVED
      : IntegrationExchangeStatus.FAILED;

    await this.prisma.integrationExchange.update({
      where: { id: exchange.id },
      data: {
        status: finalStatus,
        responseHash,
        completedAt: new Date(),
      },
    });

    if (!adapterResponse.success) {
      this.boundary.assertExternalFailureDoesNotImplyDecision({});
    }

    if (adapterResponse.httpStatusCode === 200 && !validationOutcome.isValidated) {
      this.logger.warn(
        buildIntegrationLogContext({
          exchangeId: exchange.id,
          correlationId,
          message: 'HTTP 200 received but response not validated',
          failureReasons: validationOutcome.failureReasons,
        }),
      );
    }

    return {
      requestId: request.id,
      exchangeId: exchange.id,
      correlationId,
      status: finalStatus,
      isValidated: validationOutcome.isValidated,
      isDuplicate: false,
      structuredSummary,
      missingFields: validationOutcome.missingFields,
      transformationWarnings,
    };
  }

  private async loadActiveVersion(
    integrationVersionId: string,
  ): Promise<IntegrationVersionWithCredential> {
    const version = await this.prisma.integrationVersion.findUnique({
      where: { id: integrationVersionId },
      include: {
        credential: true,
        integration: true,
      },
    });

    if (!version) {
      throw new BadRequestException('Integration version not found');
    }

    if (version.status === IntegrationLifecycleStatus.SUSPENDED) {
      throw new ForbiddenException({
        message: 'Integration is suspended',
        code: INTEGRATIONS_EXPLANATION_CODES.INTEGRATION_SUSPENDED,
      });
    }

    if (version.status !== IntegrationLifecycleStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Integration is not active',
        code: INTEGRATIONS_EXPLANATION_CODES.INTEGRATION_NOT_ACTIVE,
      });
    }

    if (version.integration.status !== IntegrationLifecycleStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Integration parent is not active',
        code: INTEGRATIONS_EXPLANATION_CODES.INTEGRATION_NOT_ACTIVE,
      });
    }

    if (version.credential?.status !== CredentialStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Integration credential is not active',
        code: INTEGRATIONS_EXPLANATION_CODES.CREDENTIAL_NOT_ACTIVE,
      });
    }

    return version;
  }

  private assertPreDispatchGuards(
    version: IntegrationVersionWithCredential,
    input: ExecuteOutboundRequestInput,
  ): void {
    const permittedOperations = version.permittedOperations as IntegrationOperation[];
    if (!permittedOperations.includes(input.operation)) {
      throw new ForbiddenException({
        message: `Operation "${input.operation}" is not permitted`,
        code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_PERMITTED,
      });
    }

    const permittedPurposes = version.permittedPurposes as string[];
    if (!permittedPurposes.includes(input.institutionalPurpose)) {
      throw new ForbiddenException({
        message: `Purpose "${input.institutionalPurpose}" is not permitted`,
        code: INTEGRATIONS_EXPLANATION_CODES.PURPOSE_NOT_PERMITTED,
      });
    }

    const versionPermittedFields = version.permittedFields as Record<string, string[]>;
    const operationFields = versionPermittedFields[input.operation] ?? [];
    const unpermittedRequestFields = input.permittedFields.filter(
      (field) => !operationFields.includes(field),
    );
    if (unpermittedRequestFields.length > 0) {
      throw new ForbiddenException({
        message: `Fields not permitted for operation: ${unpermittedRequestFields.join(', ')}`,
        code: INTEGRATIONS_EXPLANATION_CODES.FIELD_NOT_PERMITTED,
      });
    }

    const classificationOrder = [
      IntegrationDataClassification.UNCLASSIFIED,
      IntegrationDataClassification.OFFICIAL,
      IntegrationDataClassification.OFFICIAL_SENSITIVE,
      IntegrationDataClassification.PROTECTED,
      IntegrationDataClassification.SECRET,
    ];
    const requestedLevel = classificationOrder.indexOf(input.dataClassification);
    const ceilingLevel = classificationOrder.indexOf(version.dataClassificationCeiling);
    if (requestedLevel > ceilingLevel) {
      throw new ForbiddenException({
        message: 'Data classification exceeds integration ceiling',
        code: INTEGRATIONS_EXPLANATION_CODES.CLASSIFICATION_NOT_PERMITTED,
      });
    }

    const explicitlyRequestedFields = Object.keys(input.fields);
    const disallowedRequestFields = input.permittedFields.filter(
      (field) =>
        explicitlyRequestedFields.includes(field) &&
        !operationFields.includes(field),
    );
    if (disallowedRequestFields.length > 0) {
      throw new ForbiddenException({
        message: `Prohibited fields in payload: ${disallowedRequestFields.join(', ')}`,
        code: INTEGRATIONS_EXPLANATION_CODES.FIELD_NOT_PERMITTED,
      });
    }
  }

  private applyDataMinimization(
    fields: Record<string, unknown>,
    permittedFields: string[],
  ): Record<string, unknown> {
    const minimized: Record<string, unknown> = {};
    for (const field of permittedFields) {
      if (field in fields) {
        minimized[field] = fields[field];
      }
    }
    return minimized;
  }

  private assertOperationSupported(
    adapter: { capabilities: { supportedOperations: IntegrationOperation[] } },
    operation: IntegrationOperation,
  ): void {
    if (!adapter.capabilities.supportedOperations.includes(operation)) {
      throw new BadRequestException({
        message: `Adapter does not support operation "${operation}"`,
        code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_SUPPORTED,
      });
    }
  }

  private async dispatchToAdapter(
    adapter: {
      query?: (input: {
        correlationId: string;
        fields: Record<string, unknown>;
        schemaVersion: string;
      }) => Promise<IntegrationAdapterResponse>;
      submit?: (input: {
        correlationId: string;
        idempotencyKey: string;
        fields: Record<string, unknown>;
        schemaVersion: string;
      }) => Promise<IntegrationAdapterResponse>;
      sendEvent?: (input: {
        correlationId: string;
        eventType: string;
        payload: Record<string, unknown>;
      }) => Promise<IntegrationAdapterResponse>;
    },
    operation: IntegrationOperation,
    params: {
      correlationId: string;
      idempotencyKey: string;
      fields: Record<string, unknown>;
      schemaVersion: string;
    },
  ): Promise<IntegrationAdapterResponse> {
    if (operation === IntegrationOperation.QUERY) {
      if (!adapter.query) {
        throw new BadRequestException({
          message: 'Adapter does not implement query',
          code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_SUPPORTED,
        });
      }
      return adapter.query({
        correlationId: params.correlationId,
        fields: params.fields,
        schemaVersion: params.schemaVersion,
      });
    }

    if (operation === IntegrationOperation.SUBMIT) {
      if (!adapter.submit) {
        throw new BadRequestException({
          message: 'Adapter does not implement submit',
          code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_SUPPORTED,
        });
      }
      return adapter.submit({
        correlationId: params.correlationId,
        idempotencyKey: params.idempotencyKey,
        fields: params.fields,
        schemaVersion: params.schemaVersion,
      });
    }

    if (operation === IntegrationOperation.SEND_EVENT) {
      if (!adapter.sendEvent) {
        throw new BadRequestException({
          message: 'Adapter does not implement sendEvent',
          code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_SUPPORTED,
        });
      }
      return adapter.sendEvent({
        correlationId: params.correlationId,
        eventType: params.fields.eventType as string,
        payload: params.fields,
      });
    }

    throw new BadRequestException({
      message: `Operation "${operation}" not implemented in gateway dispatch`,
      code: INTEGRATIONS_EXPLANATION_CODES.OPERATION_NOT_SUPPORTED,
    });
  }

  private async recordDeliveryAttempt(
    exchangeId: string,
    attemptNumber: number,
    params: {
      outcome: IntegrationDeliveryAttemptOutcome;
      startedAt: Date;
      outcomeCode?: string;
      errorMessage?: string;
    },
  ) {
    return this.prisma.integrationDeliveryAttempt.create({
      data: {
        exchangeId,
        attemptNumber,
        outcome: params.outcome,
        startedAt: params.startedAt,
        completedAt: new Date(),
        outcomeCode: params.outcomeCode,
        errorMessage: params.errorMessage,
      },
    });
  }
}
