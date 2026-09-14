import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IntegrationDefinition,
  IntegrationDefinitionStatus,
  IntegrationEndpoint,
  IntegrationEndpointDirection,
  IntegrationVersion,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateIntegrationDefinitionInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
  technologyDependencyId?: string;
}

export interface CreateIntegrationVersionInput {
  integrationDefinitionId: string;
  versionNumber: string;
  specificationReference?: string;
  effectiveFrom?: Date;
}

export interface CreateIntegrationEndpointInput {
  integrationVersionId: string;
  endpointCode: string;
  direction: IntegrationEndpointDirection;
  urlTemplate: string;
  protocol: string;
  authenticationMethod?: string;
}

@Injectable()
export class IntegrationDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefinition(input: CreateIntegrationDefinitionInput): Promise<IntegrationDefinition> {
    return this.prisma.integrationDefinition.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        technologyDependencyId: input.technologyDependencyId,
        status: IntegrationDefinitionStatus.DRAFT,
      },
    });
  }

  async createVersion(input: CreateIntegrationVersionInput): Promise<IntegrationVersion> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: input.integrationDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException(
        `IntegrationDefinition ${input.integrationDefinitionId} not found`,
      );
    }

    return this.prisma.integrationVersion.create({
      data: {
        integrationDefinitionId: input.integrationDefinitionId,
        versionNumber: input.versionNumber,
        specificationReference: input.specificationReference,
        effectiveFrom: input.effectiveFrom,
      },
    });
  }

  async createEndpoint(input: CreateIntegrationEndpointInput): Promise<IntegrationEndpoint> {
    this.assertUrlTemplateSafe(input.urlTemplate);

    const version = await this.prisma.integrationVersion.findUnique({
      where: { id: input.integrationVersionId },
    });

    if (!version) {
      throw new NotFoundException(`IntegrationVersion ${input.integrationVersionId} not found`);
    }

    return this.prisma.integrationEndpoint.create({
      data: {
        integrationVersionId: input.integrationVersionId,
        endpointCode: input.endpointCode,
        direction: input.direction,
        urlTemplate: input.urlTemplate,
        protocol: input.protocol,
        authenticationMethod: input.authenticationMethod,
      },
    });
  }

  async getDefinition(definitionId: string): Promise<
    | (IntegrationDefinition & {
        versions: (IntegrationVersion & { endpoints: IntegrationEndpoint[] })[];
      })
    | null
  > {
    return this.prisma.integrationDefinition.findUnique({
      where: { id: definitionId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: { endpoints: true },
        },
      },
    });
  }

  async listDefinitions(institutionId: string): Promise<IntegrationDefinition[]> {
    return this.prisma.integrationDefinition.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDefinitionStatus(
    definitionId: string,
    status: IntegrationDefinitionStatus,
  ): Promise<IntegrationDefinition> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      throw new NotFoundException(`IntegrationDefinition ${definitionId} not found`);
    }

    return this.prisma.integrationDefinition.update({
      where: { id: definitionId },
      data: { status },
    });
  }

  private assertUrlTemplateSafe(urlTemplate: string): void {
    let parsed: URL;
    try {
      parsed = new URL(urlTemplate);
    } catch {
      throw new BadRequestException('Integration endpoint URL template must be an absolute URL');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('Integration endpoint URL template must use http or https');
    }

    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|localhost)/i.test(parsed.hostname)) {
      throw new BadRequestException('Integration endpoint URL template must not target loopback');
    }
  }
}
