import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RegistryQuery,
  RegistryQueryStatus,
  RegistrySynchronizationResult,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { TestRegistryAdapter } from './adapters/test-registry.adapter';
import { assertRegistryResponseSchema } from './integration.types';
import { IntegrationOutageService } from './integration-outage.service';

export interface ExecuteRegistryQueryInput {
  integrationDefinitionId: string;
  queryReference: string;
  identifier: string;
  identifierType?: string;
  externalRecordReferenceId?: string;
}

@Injectable()
export class RegistryQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registryAdapter: TestRegistryAdapter,
    private readonly outageService: IntegrationOutageService,
  ) {}

  async executeQuery(input: ExecuteRegistryQueryInput): Promise<RegistryQuery> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: input.integrationDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException(
        `IntegrationDefinition ${input.integrationDefinitionId} not found`,
      );
    }

    await this.outageService.assertExchangeAllowed(definition.id);

    const query = await this.prisma.registryQuery.create({
      data: {
        integrationDefinitionId: input.integrationDefinitionId,
        externalRecordReferenceId: input.externalRecordReferenceId,
        queryReference: input.queryReference,
        status: RegistryQueryStatus.PENDING,
      },
    });

    try {
      const response = await this.registryAdapter.query({
        queryReference: input.queryReference,
        identifier: input.identifier,
        identifierType: input.identifierType,
      });

      this.registryAdapter.validateResponse(response);
      assertRegistryResponseSchema(response);

      const completed = await this.prisma.registryQuery.update({
        where: { id: query.id },
        data: {
          status: RegistryQueryStatus.COMPLETED,
          completedAt: new Date(),
          responsePayload: response as unknown as Prisma.InputJsonValue,
        },
      });

      await this.prisma.registrySynchronization.create({
        data: {
          registryQueryId: query.id,
          syncDirection: 'INBOUND',
          syncResult: RegistrySynchronizationResult.SUCCESS,
        },
      });

      await this.outageService.recordSuccessfulExchange(definition.id);
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registry query failed';
      await this.outageService.recordFailedExchange(definition.id, message);

      return this.prisma.registryQuery.update({
        where: { id: query.id },
        data: {
          status: RegistryQueryStatus.FAILED,
          completedAt: new Date(),
          responsePayload: { error: message },
        },
      });
    }
  }

  async safeHaltQuery(queryId: string, reason: string): Promise<RegistryQuery> {
    const query = await this.prisma.registryQuery.findUnique({ where: { id: queryId } });

    if (!query) {
      throw new NotFoundException(`RegistryQuery ${queryId} not found`);
    }

    if (query.status === RegistryQueryStatus.COMPLETED) {
      throw new BadRequestException('Completed registry queries cannot be safe-halted');
    }

    return this.prisma.registryQuery.update({
      where: { id: queryId },
      data: {
        status: RegistryQueryStatus.SAFE_HALTED,
        completedAt: new Date(),
        responsePayload: { safeHaltReason: reason },
      },
    });
  }
}
