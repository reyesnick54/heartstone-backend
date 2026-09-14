import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IntegrationWebhookEvent,
  IntegrationWebhookProcessingStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationGatewayService } from './integration-gateway.service';

export interface ReceiveWebhookInput {
  integrationDefinitionId: string;
  eventType: string;
  externalEventId: string;
  payload: Record<string, unknown>;
  signature: string;
}

@Injectable()
export class IntegrationWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  async receiveWebhook(input: ReceiveWebhookInput): Promise<IntegrationWebhookEvent> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: input.integrationDefinitionId },
      include: {
        credentialReferences: true,
      },
    });

    if (!definition) {
      throw new NotFoundException(
        `IntegrationDefinition ${input.integrationDefinitionId} not found`,
      );
    }

    const credential = definition.credentialReferences[0];
    if (!credential) {
      throw new BadRequestException('Integration webhook credentials are not configured');
    }

    const payloadString = JSON.stringify(input.payload);
    const authenticated = this.gateway.verifyWebhookSignature(
      payloadString,
      input.signature,
      credential.vaultReference,
    );

    if (!authenticated) {
      throw new BadRequestException('Integration webhook authentication failed');
    }

    const existing = await this.prisma.integrationWebhookEvent.findUnique({
      where: {
        integrationDefinitionId_externalEventId: {
          integrationDefinitionId: input.integrationDefinitionId,
          externalEventId: input.externalEventId,
        },
      },
    });

    if (existing) {
      if (existing.processingStatus === IntegrationWebhookProcessingStatus.PROCESSED) {
        return this.prisma.integrationWebhookEvent.update({
          where: { id: existing.id },
          data: { processingStatus: IntegrationWebhookProcessingStatus.DUPLICATE },
        });
      }

      return existing;
    }

    const event = await this.prisma.integrationWebhookEvent.create({
      data: {
        integrationDefinitionId: input.integrationDefinitionId,
        eventType: input.eventType,
        externalEventId: input.externalEventId,
        payload: input.payload as Prisma.InputJsonValue,
        processingStatus: IntegrationWebhookProcessingStatus.AUTHENTICATED,
      },
    });

    return this.processWebhook(event.id);
  }

  async processWebhook(eventId: string): Promise<IntegrationWebhookEvent> {
    const event = await this.prisma.integrationWebhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`IntegrationWebhookEvent ${eventId} not found`);
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.PROCESSED) {
      return event;
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.REJECTED) {
      throw new BadRequestException('Rejected webhook events cannot be processed');
    }

    return this.prisma.integrationWebhookEvent.update({
      where: { id: eventId },
      data: {
        processingStatus: IntegrationWebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }
}
