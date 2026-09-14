import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DashboardDataQuality,
  DashboardDrilldownReferenceType,
  DashboardSourceAvailability,
  DashboardStalenessState,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  DASHBOARD_PROJECTION_DISCLAIMER,
  DASHBOARD_STALE_DATA_DISCLAIMER,
} from '../intelligence.constants';
import { DashboardBoundaryService } from './dashboard-boundary.service';

export interface DeriveIndicatorProjectionInput {
  indicatorDefinitionId: string;
  dashboardVersionId: string;
  institutionId?: string;
  departmentId?: string;
  caseId?: string;
  countValue: number;
  scoreValue?: number;
  dataQuality: DashboardDataQuality;
  calculatedAt?: Date;
  sourceFreshness?: Date;
  staleAfter?: Date;
  sourceAvailability?: DashboardSourceAvailability;
  limitations?: string;
  ownerIdentityId?: string;
  drilldowns: {
    referenceType: DashboardDrilldownReferenceType;
    referenceId: string;
    referenceLabel: string;
    evidencePacketId?: string;
    sourceStatus: string;
    ownerReference: string;
    effectiveDate?: Date;
    lastRefresh?: Date;
    revalidationDate?: Date;
    limitations?: string;
  }[];
}

@Injectable()
export class DashboardIndicatorProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundaryService: DashboardBoundaryService,
  ) {}

  async deriveProjection(input: DeriveIndicatorProjectionInput) {
    const indicator = await this.prisma.dashboardIndicatorDefinition.findUnique({
      where: { id: input.indicatorDefinitionId },
      include: { statusDictionaryEntry: true },
    });

    if (!indicator) {
      throw new NotFoundException(`Indicator definition "${input.indicatorDefinitionId}" was not found`);
    }

    const evidencePacketId = input.drilldowns.find((d) => d.evidencePacketId)?.evidencePacketId;

    this.boundaryService.assertGreenIndicatorHasEvidence(
      indicator.statusDictionaryEntry.colorSemantic,
      evidencePacketId,
      indicator.requiresEvidencePacket,
    );

    if (indicator.drilldownRequired && input.drilldowns.length === 0) {
      throw new BadRequestException('Material indicator requires drilldown references to authoritative records');
    }

    const now = input.calculatedAt ?? new Date();
    const staleAfter = input.staleAfter ?? new Date(now.getTime() + 60 * 60 * 1000);
    const currentStaleness = this.resolveStaleness(now, staleAfter, input.sourceAvailability);

    const existing = await this.prisma.dashboardIndicatorProjection.findFirst({
      where: {
        indicatorDefinitionId: input.indicatorDefinitionId,
        dashboardVersionId: input.dashboardVersionId,
        departmentId: input.departmentId ?? null,
        institutionId: input.institutionId ?? null,
      },
    });

    const projectionData = {
      statusDictionaryEntryId: indicator.statusDictionaryEntryId,
      institutionId: input.institutionId,
      departmentId: input.departmentId,
      caseId: input.caseId,
      countValue: input.countValue,
      scoreValue: input.scoreValue,
      displayLabel: indicator.label,
      dataQuality: input.dataQuality,
      calculatedAt: now,
      sourceFreshness: input.sourceFreshness ?? now,
      staleAfter,
      currentStaleness,
      sourceAvailability: input.sourceAvailability ?? DashboardSourceAvailability.AVAILABLE,
      limitations: input.limitations ?? indicator.statusDictionaryEntry.limitations,
      ownerIdentityId: input.ownerIdentityId,
      effectiveDate: now,
      lastRefresh: now,
      projectionVersion: (existing?.projectionVersion ?? 0) + 1,
    };

    const projection = existing
      ? await this.prisma.dashboardIndicatorProjection.update({
          where: { id: existing.id },
          data: projectionData,
        })
      : await this.prisma.dashboardIndicatorProjection.create({
          data: {
            indicatorDefinitionId: input.indicatorDefinitionId,
            dashboardVersionId: input.dashboardVersionId,
            ...projectionData,
          },
        });

    await this.prisma.dashboardDrilldownReference.deleteMany({
      where: { indicatorProjectionId: projection.id },
    });

    if (input.drilldowns.length > 0) {
      await this.prisma.dashboardDrilldownReference.createMany({
        data: input.drilldowns.map((drilldown) => ({
          indicatorProjectionId: projection.id,
          referenceType: drilldown.referenceType,
          referenceId: drilldown.referenceId,
          referenceLabel: drilldown.referenceLabel,
          evidencePacketId: drilldown.evidencePacketId,
          sourceStatus: drilldown.sourceStatus,
          ownerReference: drilldown.ownerReference,
          effectiveDate: drilldown.effectiveDate ?? now,
          lastRefresh: drilldown.lastRefresh ?? now,
          revalidationDate: drilldown.revalidationDate,
          limitations: drilldown.limitations,
        })),
      });
    }

    const fullProjection = await this.prisma.dashboardIndicatorProjection.findUniqueOrThrow({
      where: { id: projection.id },
      include: {
        drilldownReferences: true,
        statusDictionaryEntry: true,
        indicatorDefinition: true,
      },
    });

    return this.formatProjectionResponse(fullProjection);
  }

  resolveStaleness(
    calculatedAt: Date,
    staleAfter: Date,
    sourceAvailability?: DashboardSourceAvailability,
  ): DashboardStalenessState {
    if (sourceAvailability === DashboardSourceAvailability.UNAVAILABLE) {
      return DashboardStalenessState.SOURCE_UNAVAILABLE;
    }
    const now = new Date();
    if (now > staleAfter) {
      return DashboardStalenessState.STALE;
    }
    const approachingThreshold = new Date(staleAfter.getTime() - 15 * 60 * 1000);
    if (now > approachingThreshold) {
      return DashboardStalenessState.APPROACHING_STALE;
    }
    return DashboardStalenessState.FRESH;
  }

  formatProjectionResponse(
    projection: Prisma.DashboardIndicatorProjectionGetPayload<{
      include: {
        drilldownReferences: true;
        statusDictionaryEntry: true;
        indicatorDefinition: true;
      };
    }>,
  ) {
    const isStale =
      projection.currentStaleness === DashboardStalenessState.STALE ||
      projection.currentStaleness === DashboardStalenessState.SOURCE_UNAVAILABLE;

    return {
      id: projection.id,
      label: projection.displayLabel,
      count: projection.countValue,
      score: projection.scoreValue,
      dataQuality: projection.dataQuality,
      status: {
        code: projection.statusDictionaryEntry.code,
        label: projection.statusDictionaryEntry.label,
        meaning: projection.statusDictionaryEntry.meaning,
        colorSemantic: projection.statusDictionaryEntry.colorSemantic,
      },
      staleness: {
        calculatedAt: projection.calculatedAt,
        sourceFreshness: projection.sourceFreshness,
        staleAfter: projection.staleAfter,
        currentStaleness: projection.currentStaleness,
        sourceAvailability: projection.sourceAvailability,
        isStale,
        staleDataVisible: isStale,
        neverPresentedAsLive: isStale,
      },
      drilldown: projection.drilldownReferences.map((ref) => ({
        type: ref.referenceType,
        id: ref.referenceId,
        label: ref.referenceLabel,
        evidencePacketId: ref.evidencePacketId,
        sourceStatus: ref.sourceStatus,
        owner: ref.ownerReference,
        effectiveDate: ref.effectiveDate,
        lastRefresh: ref.lastRefresh,
        revalidationDate: ref.revalidationDate,
        limitations: ref.limitations,
      })),
      disclaimers: {
        projection: DASHBOARD_PROJECTION_DISCLAIMER,
        staleData: DASHBOARD_STALE_DATA_DISCLAIMER,
        statusIsDerived: true,
        visibilityDoesNotCreateAuthority: true,
        assignmentDoesNotImplyAuthority: true,
      },
      projectionVersion: projection.projectionVersion,
    };
  }
}
