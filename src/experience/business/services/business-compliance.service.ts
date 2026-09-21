import { Injectable } from '@nestjs/common';
import {
  ComplianceDashboardAudience,
  ComplianceMatterStatus,
  ContinuingObligationStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type BusinessComplianceResponseDto } from '../dto/business-compliance.dto';

const OPEN_COMPLIANCE_MATTER_STATUSES: ComplianceMatterStatus[] = [
  ComplianceMatterStatus.OPEN,
  ComplianceMatterStatus.MONITORING,
  ComplianceMatterStatus.AWAITING_REPORT,
  ComplianceMatterStatus.UNDER_REVIEW,
  ComplianceMatterStatus.INSPECTION_REQUIRED,
  ComplianceMatterStatus.CORRECTIVE_ACTION,
  ComplianceMatterStatus.ESCALATED,
  ComplianceMatterStatus.REFERRED_EXTERNALLY,
  ComplianceMatterStatus.SAFE_HALTED,
];

const OUTSTANDING_OBLIGATION_STATUSES: ContinuingObligationStatus[] = [
  ContinuingObligationStatus.NOT_YET_DUE,
  ContinuingObligationStatus.DUE,
  ContinuingObligationStatus.SUBMITTED,
  ContinuingObligationStatus.UNDER_REVIEW,
  ContinuingObligationStatus.OVERDUE,
  ContinuingObligationStatus.DISPUTED,
];

@Injectable()
export class BusinessComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listCompliance(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessComplianceResponseDto> {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      holderOrganizationId: organizationId,
      status: { in: OPEN_COMPLIANCE_MATTER_STATUSES },
    };

    const [totalItems, matters] = await Promise.all([
      this.prisma.complianceMatter.count({ where }),
      this.prisma.complianceMatter.findMany({
        where,
        include: {
          continuingObligations: {
            where: { status: { in: OUTSTANDING_OBLIGATION_STATUSES } },
            orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ openedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const matterIds = matters.map((matter) => matter.id);
    const projections =
      matterIds.length === 0
        ? []
        : await this.prisma.complianceStatusProjection.findMany({
            where: {
              audience: ComplianceDashboardAudience.HOLDER,
              caseId: {
                in: matters
                  .map((matter) => matter.caseId)
                  .filter((caseId): caseId is string => caseId !== null),
              },
            },
            orderBy: [{ lastDerivedAt: 'desc' }],
          });

    const projectionByCaseId = new Map<string, (typeof projections)[number]>();
    for (const projection of projections) {
      if (projection.caseId) {
        projectionByCaseId.set(projection.caseId, projection);
      }
    }

    return {
      items: matters.map((matter) => {
        const projection = matter.caseId ? projectionByCaseId.get(matter.caseId) : undefined;
        return {
          complianceMatterId: matter.id,
          complianceMatterNumber: matter.complianceMatterNumber,
          status: matter.status,
          openedAt: matter.openedAt.toISOString(),
          authoritativeStatusLabel: projection?.instrumentStatusSnapshot ?? matter.status,
          outstandingObligations: matter.continuingObligations.map((obligation) => ({
            obligationId: obligation.id,
            complianceMatterId: matter.id,
            obligationCode: obligation.obligationCode,
            description: obligation.description,
            status: obligation.status,
            dueDate: obligation.dueDate?.toISOString() ?? null,
          })),
        };
      }),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
      disclaimer: {
        label:
          'Compliance status reflects authoritative compliance records. Projections and obligations do not imply approval.',
        labelKey: 'business.compliance.disclaimer',
      },
    };
  }
}
