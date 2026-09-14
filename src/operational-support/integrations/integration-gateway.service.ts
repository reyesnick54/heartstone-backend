import { createHash, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IntegrationEndpoint,
  IntegrationExchangeStatus,
  IntegrationMessageDirection,
  IntegrationRequestStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  DEFAULT_INTEGRATION_MAX_PAYLOAD_BYTES,
  DEFAULT_INTEGRATION_REQUEST_TIMEOUT_MS,
} from '../operational-support.constants';
import { IntegrationOutageService } from './integration-outage.service';

export interface AuthorizedExchangeInput {
  integrationVersionId: string;
  endpointCode: string;
  requestReference: string;
  payload: Record<string, unknown>;
  masterAdministrativeFileId?: string;
  caseId?: string;
  correlationId?: string;
}

export interface AuthorizedExchangeResult {
  requestId: string;
  exchangeId: string;
  messageId: string;
  externalReference: string;
  responsePayload: Record<string, unknown>;
}

@Injectable()
export class IntegrationGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outageService: IntegrationOutageService,
  ) {}

  async executeAuthorizedExchange(
    input: AuthorizedExchangeInput,
  ): Promise<AuthorizedExchangeResult> {
    const endpoint = await this.resolveEndpoint(input.integrationVersionId, input.endpointCode);
    const definition = await this.prisma.integrationDefinition.findFirst({
      where: {
        versions: { some: { id: input.integrationVersionId } },
      },
    });

    if (!definition) {
      throw new NotFoundException(`IntegrationVersion ${input.integrationVersionId} not found`);
    }

    await this.outageService.assertExchangeAllowed(definition.id);

    const payloadBytes = Buffer.byteLength(JSON.stringify(input.payload), 'utf8');
    if (payloadBytes > DEFAULT_INTEGRATION_MAX_PAYLOAD_BYTES) {
      throw new BadRequestException('Integration payload exceeds configured size limit');
    }

    const request = await this.prisma.integrationRequest.create({
      data: {
        integrationVersionId: input.integrationVersionId,
        requestReference: input.requestReference,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        caseId: input.caseId,
        correlationId: input.correlationId,
        status: IntegrationRequestStatus.IN_PROGRESS,
      },
    });

    const exchange = await this.prisma.integrationExchange.create({
      data: {
        integrationRequestId: request.id,
        status: IntegrationExchangeStatus.INITIATED,
      },
    });

    const resolvedUrl = this.resolveEndpointUrl(endpoint.urlTemplate, input.payload);
    this.assertUrlMatchesEndpoint(resolvedUrl, endpoint);

    const payloadHash = createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');

    const message = await this.prisma.integrationMessage.create({
      data: {
        integrationExchangeId: exchange.id,
        integrationEndpointId: endpoint.id,
        direction: IntegrationMessageDirection.OUTBOUND,
        messageType: 'AUTHORIZED_EXCHANGE',
        payload: input.payload as Prisma.InputJsonValue,
        payloadHash,
        sentAt: new Date(),
      },
    });

    const responsePayload = await this.dispatchWithTimeout(resolvedUrl, input.payload);

    const externalReference =
      typeof responsePayload.externalReference === 'string'
        ? responsePayload.externalReference
        : `exchange:${exchange.id}`;

    await this.prisma.integrationExchange.update({
      where: { id: exchange.id },
      data: {
        status: IntegrationExchangeStatus.COMPLETED,
        completedAt: new Date(),
        externalReference,
      },
    });

    await this.prisma.integrationRequest.update({
      where: { id: request.id },
      data: {
        status: IntegrationRequestStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.outageService.recordSuccessfulExchange(definition.id);

    return {
      requestId: request.id,
      exchangeId: exchange.id,
      messageId: message.id,
      externalReference,
      responsePayload,
    };
  }

  private async resolveEndpoint(
    integrationVersionId: string,
    endpointCode: string,
  ): Promise<IntegrationEndpoint> {
    const endpoint = await this.prisma.integrationEndpoint.findUnique({
      where: {
        integrationVersionId_endpointCode: {
          integrationVersionId,
          endpointCode,
        },
      },
    });

    if (!endpoint) {
      throw new NotFoundException(
        `IntegrationEndpoint ${endpointCode} not found for version ${integrationVersionId}`,
      );
    }

    return endpoint;
  }

  private resolveEndpointUrl(
    urlTemplate: string,
    payload: Record<string, unknown>,
  ): string {
    return urlTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
      const value = payload[key];
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new BadRequestException(`Missing URL template variable "${key}"`);
      }
      return encodeURIComponent(String(value));
    });
  }

  private assertUrlMatchesEndpoint(resolvedUrl: string, endpoint: IntegrationEndpoint): void {
    const resolved = new URL(resolvedUrl);
    const template = new URL(endpoint.urlTemplate.replace(/\{[a-zA-Z0-9_]+\}/g, 'placeholder'));

    if (resolved.protocol !== template.protocol || resolved.host !== template.host) {
      throw new BadRequestException(
        'Resolved URL rejected for SSRF prevention; only registered IntegrationEndpoint hosts are permitted',
      );
    }

    if (/^(127\.|10\.|192\.168\.|169\.254\.|localhost)/i.test(resolved.hostname)) {
      throw new BadRequestException('Resolved URL rejected for SSRF prevention');
    }
  }

  private async dispatchWithTimeout(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, DEFAULT_INTEGRATION_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadRequestException(`Integration endpoint returned HTTP ${String(response.status)}`);
      }

      const body = (await response.json()) as Record<string, unknown>;
      return body;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Integration exchange failed';
      throw new BadRequestException(message);
    } finally {
      clearTimeout(timeout);
    }
  }

  verifyWebhookSignature(payload: string, providedSignature: string, secret: string): boolean {
    const expected = createHash('sha256').update(`${secret}:${payload}`).digest('hex');
    const providedBuffer = Buffer.from(providedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
