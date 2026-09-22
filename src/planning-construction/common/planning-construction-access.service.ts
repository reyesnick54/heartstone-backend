import { ForbiddenException, Injectable } from '@nestjs/common';
import { DevelopmentAccessActorKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PLANNING_REASON_CODES } from '../planning-construction.constants';

export interface DevelopmentProjectAccessContext {
  accessorIdentityId: string;
  developmentProjectId: string;
  actorKind: DevelopmentAccessActorKind;
  endpoint: string;
  organizationId?: string;
}

@Injectable()
export class PlanningConstructionAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertProjectAccess(context: DevelopmentProjectAccessContext): Promise<void> {
    const project = await this.prisma.developmentProject.findUnique({
      where: { id: context.developmentProjectId },
    });

    if (!project) {
      throw new ForbiddenException(PLANNING_REASON_CODES.CROSS_APPLICANT_ACCESS_DENIED);
    }

    let granted = false;
    let denialReason: string | undefined;

    if (context.actorKind === DevelopmentAccessActorKind.APPLICANT) {
      granted = project.primaryApplicantIdentityId === context.accessorIdentityId;
      if (!granted) {
        denialReason = PLANNING_REASON_CODES.CROSS_APPLICANT_ACCESS_DENIED;
      }
    } else if (context.actorKind === DevelopmentAccessActorKind.REPRESENTATIVE) {
      if (!context.organizationId || project.organizationId !== context.organizationId) {
        denialReason = PLANNING_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
      } else {
        const membership = await this.prisma.organizationMembership.findFirst({
          where: {
            organizationId: context.organizationId,
            identityId: context.accessorIdentityId,
            status: 'ACTIVE',
          },
        });
        granted = membership != null;
        if (!granted) {
          denialReason = PLANNING_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
        }
      }
    } else if (
      context.actorKind === DevelopmentAccessActorKind.PLANNING_OFFICER ||
      context.actorKind === DevelopmentAccessActorKind.INSPECTOR
    ) {
      granted = true;
    } else {
      denialReason = PLANNING_REASON_CODES.CROSS_APPLICANT_ACCESS_DENIED;
    }

    await this.prisma.developmentAccessAudit.create({
      data: {
        developmentProjectId: context.developmentProjectId,
        accessorIdentityId: context.accessorIdentityId,
        actorKind: context.actorKind,
        endpoint: context.endpoint,
        granted,
        denialReason,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        denialReason ?? PLANNING_REASON_CODES.CROSS_APPLICANT_ACCESS_DENIED,
      );
    }
  }
}
