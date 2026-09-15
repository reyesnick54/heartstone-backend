import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CapabilityDefinitionService } from '../capabilities/capability-definition.service';

export interface AssignCapabilityOwnersInput {
  capabilityDefinitionId: string;
  institutionalOwnerId?: string;
  technicalOwnerIdentityId?: string;
  assignedByIdentityId?: string;
}

@Injectable()
export class CapabilityOwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionService: CapabilityDefinitionService,
  ) {}

  async assignOwners(input: AssignCapabilityOwnersInput) {
    await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    await this.prisma.capabilityOwnerAssignment.updateMany({
      where: { capabilityDefinitionId: input.capabilityDefinitionId, isCurrent: true },
      data: { isCurrent: false, effectiveUntil: new Date() },
    });

    return this.prisma.capabilityOwnerAssignment.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        institutionalOwnerId: input.institutionalOwnerId,
        technicalOwnerIdentityId: input.technicalOwnerIdentityId,
        assignedByIdentityId: input.assignedByIdentityId,
        isCurrent: true,
      },
    });
  }

  async getCurrentOwners(capabilityDefinitionId: string) {
    return this.prisma.capabilityOwnerAssignment.findFirst({
      where: { capabilityDefinitionId, isCurrent: true },
      include: {
        institutionalOwner: true,
        technicalOwner: true,
      },
    });
  }
}
