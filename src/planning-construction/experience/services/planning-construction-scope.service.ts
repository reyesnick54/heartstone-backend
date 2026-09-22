import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DevelopmentAccessActorKind, MembershipStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { PlanningConstructionAccessService } from '../../common/planning-construction-access.service';
import { PLANNING_REASON_CODES } from '../../planning-construction.constants';
import { DevelopmentPortalProjectionService } from './development-portal-projection.service';

@Injectable()
export class PlanningConstructionScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PlanningConstructionAccessService,
    private readonly portal: DevelopmentPortalProjectionService,
  ) {}

  private async assertOrganizationMembership(
    identityId: string,
    organizationId: string,
  ): Promise<void> {
    const now = new Date();
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        identityId,
        status: MembershipStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });
    if (!membership) {
      throw new ForbiddenException(PLANNING_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED);
    }
  }

  async listCitizenProjects(identityId: string) {
    const projects = await this.prisma.developmentProject.findMany({
      where: { primaryApplicantIdentityId: identityId },
      orderBy: { updatedAt: 'desc' },
      include: { site: true },
    });

    return {
      items: projects.map((project) => ({
        id: project.id,
        projectReference: project.projectReference,
        title: project.title,
        status: project.status,
        siteLabel: project.site?.siteLabel ?? null,
      })),
    };
  }

  async getCitizenProject(identityId: string, projectId: string) {
    await this.access.assertProjectAccess({
      accessorIdentityId: identityId,
      developmentProjectId: projectId,
      actorKind: DevelopmentAccessActorKind.APPLICANT,
      endpoint: 'citizen/development-projects/:id',
    });

    const view = await this.portal.buildProjectPortalView(projectId);
    if (!view) {
      throw new NotFoundException('Development project not found');
    }
    return view;
  }

  async listOrganizationProjects(identityId: string, organizationId: string) {
    await this.assertOrganizationMembership(identityId, organizationId);

    const projects = await this.prisma.developmentProject.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: { site: true },
    });

    return {
      items: projects.map((project) => ({
        id: project.id,
        projectReference: project.projectReference,
        title: project.title,
        status: project.status,
        siteLabel: project.site?.siteLabel ?? null,
      })),
    };
  }

  async getOrganizationProject(identityId: string, organizationId: string, projectId: string) {
    await this.assertOrganizationMembership(identityId, organizationId);
    await this.access.assertProjectAccess({
      accessorIdentityId: identityId,
      developmentProjectId: projectId,
      actorKind: DevelopmentAccessActorKind.REPRESENTATIVE,
      endpoint: 'business/development-projects/:projectId',
      organizationId,
    });

    const project = await this.prisma.developmentProject.findUnique({ where: { id: projectId } });
    if (project?.organizationId !== organizationId) {
      throw new NotFoundException('Development project not found for organization');
    }

    const view = await this.portal.buildProjectPortalView(projectId);
    if (!view) {
      throw new NotFoundException('Development project not found');
    }
    return view;
  }

  async listOrganizationPermits(identityId: string, organizationId: string, projectId: string) {
    const view = await this.getOrganizationProject(identityId, organizationId, projectId);
    return { items: view.permits, permitStatusSummary: view.permitStatusSummary };
  }

  async listOrganizationInspections(identityId: string, organizationId: string, projectId: string) {
    const view = await this.getOrganizationProject(identityId, organizationId, projectId);
    return { items: view.inspections };
  }

  async listOrganizationActions(identityId: string, organizationId: string, projectId: string) {
    const view = await this.getOrganizationProject(identityId, organizationId, projectId);
    return {
      correctiveActions: view.correctiveActions,
      outstandingFees: view.outstandingFees,
      evidenceOutstandingCount: view.evidenceOutstandingCount,
      openInspections: view.openInspections,
    };
  }

  async listCitizenActions(identityId: string) {
    const projects = await this.listCitizenProjects(identityId);
    const actions = [];

    for (const item of projects.items) {
      const view = await this.portal.buildProjectPortalView(item.id);
      if (!view) {
        continue;
      }
      actions.push({
        projectId: item.id,
        projectReference: item.projectReference,
        outstandingFees: view.outstandingFees.length,
        evidenceOutstandingCount: view.evidenceOutstandingCount,
        openInspections: view.openInspections,
        correctiveActions: view.correctiveActions.filter((action) => action.status === 'OPEN'),
      });
    }

    return { items: actions };
  }
}
