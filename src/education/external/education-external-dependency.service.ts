import { randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  EducationExternalDependencyRecordedBy,
  EducationExternalDependencyType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EducationExternalDependencyService {
  constructor(private readonly prisma: PrismaService) {}

  async recordIntegrationGatewayReference(input: {
    caseId?: string;
    studentProfileId?: string;
    dependencyType: EducationExternalDependencyType;
    integrationGatewayRouteCode: string;
    externalAuthorityId?: string;
    recordedByIdentityId?: string;
  }) {
    if (!input.integrationGatewayRouteCode.startsWith('TEMPLATE-EDU-GW-')) {
      throw new ForbiddenException(
        'External education integrations must reference Integration Gateway route codes, not embedded credentials',
      );
    }

    return this.prisma.educationExternalDependency.create({
      data: {
        id: randomUUID(),
        dependencyReference: `EDU-EXT-${randomUUID().slice(0, 8).toUpperCase()}`,
        caseId: input.caseId,
        studentProfileId: input.studentProfileId,
        dependencyType: input.dependencyType,
        integrationGatewayRouteCode: input.integrationGatewayRouteCode,
        externalAuthorityId: input.externalAuthorityId,
        recordedBy: EducationExternalDependencyRecordedBy.INTEGRATION_GATEWAY,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }
}
