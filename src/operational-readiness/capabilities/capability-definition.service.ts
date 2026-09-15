import { Injectable, NotFoundException } from '@nestjs/common';
import { CapabilitySubjectType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OperationalReadinessBoundaryService } from '../common/operational-readiness-boundary.service';

export interface CreateCapabilityDefinitionInput {
  code: string;
  name: string;
  description?: string;
  subjectType: CapabilitySubjectType;
  subjectReferenceId?: string;
}

export interface CreateCapabilityVersionInput {
  capabilityDefinitionId: string;
  versionNumber: string;
  description?: string;
  releaseReference?: string;
  setAsCurrent?: boolean;
}

@Injectable()
export class CapabilityDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalReadinessBoundaryService,
  ) {}

  async createDefinition(input: CreateCapabilityDefinitionInput) {
    return this.prisma.capabilityDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        subjectType: input.subjectType,
        subjectReferenceId: input.subjectReferenceId,
      },
    });
  }

  async findDefinitionById(id: string) {
    const definition = await this.prisma.capabilityDefinition.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        ownerAssignments: { where: { isCurrent: true } },
      },
    });

    if (!definition) {
      throw new NotFoundException(`Capability definition ${id} not found`);
    }

    return definition;
  }

  async findDefinitionByCode(code: string) {
    const definition = await this.prisma.capabilityDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Capability definition with code ${code} not found`);
    }

    return definition;
  }

  async createVersion(input: CreateCapabilityVersionInput) {
    await this.findDefinitionById(input.capabilityDefinitionId);

    if (input.setAsCurrent) {
      await this.prisma.capabilityVersion.updateMany({
        where: { capabilityDefinitionId: input.capabilityDefinitionId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.capabilityVersion.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        versionNumber: input.versionNumber,
        description: input.description,
        releaseReference: input.releaseReference,
        isCurrent: input.setAsCurrent ?? false,
      },
    });
  }

  async updateDefinition(
    id: string,
    input: Partial<CreateCapabilityDefinitionInput>,
    clientPayload?: Record<string, unknown>,
  ) {
    if (clientPayload) {
      this.boundary.rejectClientProtectedMaturityFields(clientPayload);
    }

    await this.findDefinitionById(id);

    return this.prisma.capabilityDefinition.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        subjectType: input.subjectType,
        subjectReferenceId: input.subjectReferenceId,
      },
    });
  }

  async getOperationalView(id: string) {
    const definition = await this.findDefinitionById(id);

    return {
      ...definition,
      appearsOperational:
        definition.currentMaturityState === 'OPERATIONALLY_ACTIVATED' &&
        !definition.isSuspended &&
        !definition.isRetired,
    };
  }
}
