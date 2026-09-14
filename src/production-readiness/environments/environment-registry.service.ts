import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EnvironmentDefinition,
  EnvironmentDefinitionStatus,
  EnvironmentIntegrationMode,
  PlatformEnvironmentClassification,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import {
  NON_PRODUCTION_CLASSIFICATIONS,
  PRODUCTION_CAPABLE_CLASSIFICATIONS,
} from '../production-readiness.constants';

export interface RegisterEnvironmentInput {
  code: string;
  name: string;
  description?: string;
  classification: PlatformEnvironmentClassification;
  credentialsNamespace: string;
  secretsNamespace: string;
  dataPartitionKey: string;
  integrationEndpointPrefix: string;
  integrationMode?: EnvironmentIntegrationMode;
  accessControlPolicy?: Record<string, unknown>;
}

@Injectable()
export class EnvironmentRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async registerEnvironment(input: RegisterEnvironmentInput): Promise<EnvironmentDefinition> {
    const allowsProductionSemantics = PRODUCTION_CAPABLE_CLASSIFICATIONS.includes(
      input.classification,
    );

    if (
      NON_PRODUCTION_CLASSIFICATIONS.includes(input.classification) &&
      allowsProductionSemantics
    ) {
      throw new BadRequestException(
        'Non-production classifications cannot allow production semantics',
      );
    }

    return this.prisma.environmentDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        classification: input.classification,
        status: EnvironmentDefinitionStatus.ACTIVE,
        credentialsNamespace: input.credentialsNamespace,
        secretsNamespace: input.secretsNamespace,
        dataPartitionKey: input.dataPartitionKey,
        integrationEndpointPrefix: input.integrationEndpointPrefix,
        integrationMode: input.integrationMode ?? EnvironmentIntegrationMode.MOCK,
        accessControlPolicy: (input.accessControlPolicy ?? {}) as Prisma.InputJsonValue,
        allowsProductionSemantics,
      },
    });
  }

  async getByCode(code: string): Promise<EnvironmentDefinition> {
    const environment = await this.prisma.environmentDefinition.findUnique({ where: { code } });
    if (!environment) {
      throw new NotFoundException(`EnvironmentDefinition ${code} not found`);
    }
    return environment;
  }

  async getByClassification(
    classification: PlatformEnvironmentClassification,
  ): Promise<EnvironmentDefinition> {
    const environment = await this.prisma.environmentDefinition.findFirst({
      where: { classification, status: EnvironmentDefinitionStatus.ACTIVE },
    });
    if (!environment) {
      throw new NotFoundException(`Active environment for ${classification} not found`);
    }
    return environment;
  }

  validateRuntimeEnvironment(
    environment: EnvironmentDefinition,
    runtimeNodeEnv: string,
    runtimeEnvClassification?: string,
  ): void {
    this.boundary.assertNoProductionSemanticsViaSpoofing(
      environment.classification,
      runtimeNodeEnv,
      runtimeEnvClassification,
    );
  }

  async registerCredentialBinding(
    environmentDefinitionId: string,
    credentialReference: string,
    credentialNamespace: string,
    isProductionCredential: boolean,
  ) {
    const environment = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: environmentDefinitionId },
    });

    this.boundary.assertProductionCredentialNotInNonProduction(
      isProductionCredential,
      environment.classification,
    );

    return this.prisma.environmentCredentialBinding.create({
      data: {
        environmentDefinitionId,
        credentialReference,
        credentialNamespace,
        isProductionCredential,
      },
    });
  }

  async registerIntegrationEndpoint(
    environmentDefinitionId: string,
    endpointKey: string,
    endpointUrl: string,
    integrationMode: EnvironmentIntegrationMode,
    isLiveGovernmentEndpoint: boolean,
  ) {
    const environment = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: environmentDefinitionId },
    });

    this.boundary.assertLiveGovernmentEndpointNotCallableByDefault(
      isLiveGovernmentEndpoint,
      environment.classification,
    );

    return this.prisma.environmentIntegrationEndpoint.create({
      data: {
        environmentDefinitionId,
        endpointKey,
        endpointUrl,
        integrationMode,
        isLiveGovernmentEndpoint,
      },
    });
  }
}
