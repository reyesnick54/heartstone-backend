import { Injectable, NotFoundException } from '@nestjs/common';
import {
  StrategicProjectDependencyOwnerType,
  StrategicProjectDependencyType,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface CreateStrategicProjectDependencyInput {
  profileId: string;
  dependencyType: StrategicProjectDependencyType;
  ownerType: StrategicProjectDependencyOwnerType;
  ownerReference: string;
  ownerName?: string;
  description?: string;
  statusSummary?: string;
  sourceDataRefs?: Prisma.InputJsonValue;
}

@Injectable()
export class StrategicProjectDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async createDependency(input: CreateStrategicProjectDependencyInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    const isGovernmentOwned = input.dependencyType === StrategicProjectDependencyType.GOVERNMENT;

    this.boundary.assertGovernmentDependencyOwnerPreserved({
      dependencyType: input.dependencyType,
      ownerType: input.ownerType,
      isGovernmentOwned,
    });

    return this.prisma.strategicProjectDependency.create({
      data: {
        profileId: input.profileId,
        dependencyType: input.dependencyType,
        ownerType: input.ownerType,
        ownerReference: input.ownerReference,
        ownerName: input.ownerName,
        description: input.description,
        statusSummary: input.statusSummary,
        isGovernmentOwned,
        sourceDataRefs: input.sourceDataRefs ?? [],
      },
    });
  }
}
