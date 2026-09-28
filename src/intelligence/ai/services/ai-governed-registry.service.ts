import { Injectable } from '@nestjs/common';
import {
  AiAgentDefinitionStatus,
  AiAgentIdentityStatus,
  AiGovernedDataClass,
  AiModelProviderStatus,
  AiModelStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export interface RegisterGovernedAiFixtureInput {
  institutionId: string;
  responsibleOwnerIdentityId: string;
  initiatorIdentityId: string;
  agentCode: string;
  modelCode: string;
  providerCode: string;
  toolCodes: string[];
  dataClasses: AiGovernedDataClass[];
}

export interface GovernedAiFixtureIds {
  aiAgentIdentityId: string;
  agentDefinitionId: string;
  modelDefinitionId: string;
  modelVersionId: string;
  providerRegistryId: string;
}

@Injectable()
export class AiGovernedRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async registerApprovedFixture(input: RegisterGovernedAiFixtureInput): Promise<GovernedAiFixtureIds> {
    const provider = await this.prisma.aiModelProviderRegistry.upsert({
      where: { providerCode: input.providerCode },
      create: {
        providerCode: input.providerCode,
        displayName: input.providerCode,
        ownerInstitutionId: input.institutionId,
        status: AiModelProviderStatus.ACTIVE,
      },
      update: { status: AiModelProviderStatus.ACTIVE },
    });

    const model = await this.prisma.aiModelDefinition.upsert({
      where: {
        ownerInstitutionId_modelCode: {
          ownerInstitutionId: input.institutionId,
          modelCode: input.modelCode,
        },
      },
      create: {
        modelCode: input.modelCode,
        ownerInstitutionId: input.institutionId,
        providerRegistryId: provider.id,
        providerModelIdentifier: `${input.modelCode}-identifier`,
        status: AiModelStatus.ACTIVE,
        allowedUseClasses: ['GOVERNMENT_ANALYSIS'],
      },
      update: { status: AiModelStatus.ACTIVE },
    });

    const modelVersion = await this.prisma.aiModelVersion.upsert({
      where: {
        modelDefinitionId_versionLabel: {
          modelDefinitionId: model.id,
          versionLabel: '1.0.0',
        },
      },
      create: {
        modelDefinitionId: model.id,
        versionLabel: '1.0.0',
        status: AiModelStatus.ACTIVE,
      },
      update: { status: AiModelStatus.ACTIVE },
    });

    const identity = await this.prisma.aiAgentIdentity.upsert({
      where: { agentCode: input.agentCode },
      create: {
        agentCode: input.agentCode,
        displayName: input.agentCode,
        ownerInstitutionId: input.institutionId,
        responsibleOwnerIdentityId: input.responsibleOwnerIdentityId,
        purpose: 'Governed AI test fixture',
        status: AiAgentIdentityStatus.ACTIVE,
        approvedCapabilities: ['SUMMARIZE'],
      },
      update: { status: AiAgentIdentityStatus.ACTIVE },
    });

    const agent = await this.prisma.aiAgentDefinition.upsert({
      where: {
        ownerInstitutionId_agentCode_versionLabel: {
          ownerInstitutionId: input.institutionId,
          agentCode: input.agentCode,
          versionLabel: '1.0.0',
        },
      },
      create: {
        agentCode: input.agentCode,
        ownerInstitutionId: input.institutionId,
        aiAgentIdentityId: identity.id,
        modelDefinitionId: model.id,
        purpose: 'Governed AI test fixture',
        status: AiAgentDefinitionStatus.ACTIVE,
        humanOversightRequired: true,
        toolAllowlist: {
          create: input.toolCodes.map((toolCode) => ({ toolCode })),
        },
        dataClassAllowlist: {
          create: input.dataClasses.map((dataClass) => ({ dataClass })),
        },
      },
      update: {
        status: AiAgentDefinitionStatus.ACTIVE,
      },
    });

    for (const toolCode of input.toolCodes) {
      await this.prisma.aiAgentToolAllowlist.upsert({
        where: {
          agentDefinitionId_toolCode: { agentDefinitionId: agent.id, toolCode },
        },
        create: { agentDefinitionId: agent.id, toolCode },
        update: {},
      });
    }

    for (const dataClass of input.dataClasses) {
      await this.prisma.aiAgentDataClassAllowlist.upsert({
        where: {
          agentDefinitionId_dataClass: { agentDefinitionId: agent.id, dataClass },
        },
        create: { agentDefinitionId: agent.id, dataClass },
        update: {},
      });
    }

    return {
      aiAgentIdentityId: identity.id,
      agentDefinitionId: agent.id,
      modelDefinitionId: model.id,
      modelVersionId: modelVersion.id,
      providerRegistryId: provider.id,
    };
  }
}
