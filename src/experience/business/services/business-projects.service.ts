import { Injectable } from '@nestjs/common';
import {
  StrategicProjectDependencyOwnerType,
  StrategicProjectMilestoneStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type BusinessProjectsResponseDto } from '../dto/business-project.dto';

const VERIFIED_MILESTONE_STATUSES: StrategicProjectMilestoneStatus[] = [
  StrategicProjectMilestoneStatus.VERIFIED,
  StrategicProjectMilestoneStatus.ACCEPTED,
  StrategicProjectMilestoneStatus.COMPLETED,
  StrategicProjectMilestoneStatus.REVALIDATED,
];

@Injectable()
export class BusinessProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listProjects(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessProjectsResponseDto> {
    const orgAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const caseWhere = this.access.buildCaseWhere(orgAccess);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const accessibleCases = await this.prisma.case.findMany({
      where: caseWhere,
      select: { id: true },
    });
    const caseIds = accessibleCases.map((caseRecord) => caseRecord.id);

    if (caseIds.length === 0) {
      return {
        items: [],
        pagination: this.access.buildPaginationMeta(page, pageSize, 0),
        disclaimer: {
          label:
            'Investment and strategic project summaries are informational. Reported milestones are not verified completion unless explicitly marked verified.',
          labelKey: 'business.projects.disclaimer',
        },
      };
    }

    const where = { caseId: { in: caseIds } };

    const [totalItems, profiles] = await Promise.all([
      this.prisma.strategicProjectProfile.count({ where }),
      this.prisma.strategicProjectProfile.findMany({
        where,
        include: {
          milestones: { orderBy: [{ plannedDate: 'asc' }, { id: 'asc' }] },
          dependencies: {
            where: { ownerType: StrategicProjectDependencyOwnerType.GOVERNMENT },
            orderBy: [{ id: 'asc' }],
          },
          statusProjections: {
            orderBy: [{ lastDerivedAt: 'desc' }],
            take: 1,
          },
          capitalEvidence: { select: { id: true } },
          employmentEvidence: { select: { id: true } },
          infrastructureRecords: { select: { id: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: profiles.map((profile) => {
        const latestProjection = profile.statusProjections[0];
        const outstandingEvidenceCount =
          profile.capitalEvidence.length +
          profile.employmentEvidence.length +
          profile.infrastructureRecords.length;

        return {
          projectId: profile.id,
          projectCode: profile.projectCode,
          title: profile.title,
          currentStage: profile.currentStage,
          reportedStatusIsNotVerifiedCompletion: profile.doesNotInferApprovalFromActivity,
          caseId: profile.caseId,
          milestones: profile.milestones.map((milestone) => ({
            milestoneId: milestone.id,
            title: milestone.title,
            status: milestone.status,
            isVerifiedCompletion:
              VERIFIED_MILESTONE_STATUSES.includes(milestone.status) &&
              milestone.verifiedDate !== null,
            plannedDate: milestone.plannedDate?.toISOString() ?? null,
            reportedDate: milestone.reportedDate?.toISOString() ?? null,
            verifiedDate: milestone.verifiedDate?.toISOString() ?? null,
          })),
          governmentDependencies: profile.dependencies.map((dependency) => ({
            dependencyId: dependency.id,
            dependencyType: dependency.dependencyType,
            ownerType: dependency.ownerType,
            description: dependency.description ?? dependency.ownerReference,
            isResolved: false,
          })),
          outstandingEvidenceCount,
          statusProjectionDisclaimer: latestProjection?.projectionDisclaimer ?? null,
        };
      }),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
      disclaimer: {
        label:
          'Investment and strategic project summaries are informational. Reported milestones are not verified completion unless explicitly marked verified.',
        labelKey: 'business.projects.disclaimer',
      },
    };
  }
}
