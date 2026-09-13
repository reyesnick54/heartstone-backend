import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceDashboardAudience,
  ComplianceIndicatorType,
  ComplianceProjectionStatus,
  ContinuingObligationStatus,
  InspectionStatus,
  InstrumentLifecycleStatus,
  OfficialInstrumentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { COMPLIANCE_PROJECTION_DISCLAIMER } from './compliance-status.constants';

export interface DeriveComplianceProjectionInput {
  audience: ComplianceDashboardAudience;
  subjectIdentityId?: string;
  subjectOfficeholderId?: string;
  subjectDepartmentId?: string;
  subjectInstitutionId?: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  officialInstrumentId?: string;
  functionAuthorityRecordId?: string;
  authorityEvaluationRecordId?: string;
  underlyingAssessmentType?: string;
  underlyingAssessmentId?: string;
  evidenceCutoffAt?: Date;
}

export interface ComplianceSourceSnapshot {
  openFindingRefs: Prisma.JsonValue;
  openCorrectiveActionRefs: Prisma.JsonValue;
  instrumentStatusSnapshot: string | null;
  status: ComplianceProjectionStatus;
  indicators: {
    indicatorType: ComplianceIndicatorType;
    displayLabel: string;
    countValue: number;
    drillDownReferences: Prisma.JsonValue;
  }[];
}

@Injectable()
export class ComplianceProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async deriveProjection(input: DeriveComplianceProjectionInput) {
    const snapshot = await this.buildSourceSnapshot(input);

    const existing = await this.findExistingProjection(input);

    const projectionData = {
      status: snapshot.status,
      projectionDisclaimer: COMPLIANCE_PROJECTION_DISCLAIMER,
      underlyingAssessmentType: input.underlyingAssessmentType,
      underlyingAssessmentId: input.underlyingAssessmentId,
      evidenceCutoffAt: input.evidenceCutoffAt,
      openFindingRefs: snapshot.openFindingRefs as Prisma.InputJsonValue,
      openCorrectiveActionRefs: snapshot.openCorrectiveActionRefs as Prisma.InputJsonValue,
      instrumentStatusSnapshot: snapshot.instrumentStatusSnapshot,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      lastReviewedAt: new Date(),
      lastDerivedAt: new Date(),
      projectionVersion: (existing?.projectionVersion ?? 0) + 1,
    };

    const projection = existing
      ? await this.prisma.complianceStatusProjection.update({
          where: { id: existing.id },
          data: projectionData,
        })
      : await this.prisma.complianceStatusProjection.create({
          data: {
            audience: input.audience,
            subjectIdentityId: input.subjectIdentityId,
            subjectOfficeholderId: input.subjectOfficeholderId,
            subjectDepartmentId: input.subjectDepartmentId,
            subjectInstitutionId: input.subjectInstitutionId,
            caseId: input.caseId,
            masterAdministrativeFileId: input.masterAdministrativeFileId,
            officialInstrumentId: input.officialInstrumentId,
            ...projectionData,
          },
        });

    await this.prisma.complianceIndicator.deleteMany({ where: { projectionId: projection.id } });
    if (snapshot.indicators.length > 0) {
      await this.prisma.complianceIndicator.createMany({
        data: snapshot.indicators.map((indicator) => ({
          projectionId: projection.id,
          indicatorType: indicator.indicatorType,
          displayLabel: indicator.displayLabel,
          countValue: indicator.countValue,
          drillDownReferences: indicator.drillDownReferences as Prisma.InputJsonValue,
        })),
      });
    }

    await this.prisma.complianceMonitoringEvent.create({
      data: {
        projectionId: projection.id,
        eventType: 'PROJECTION_REFRESHED',
        eventSummary: `Compliance projection refreshed for ${input.audience}`,
        sourceDataRefs: snapshot.indicators.flatMap((item) =>
          Array.isArray(item.drillDownReferences) ? item.drillDownReferences : [],
        ),
      },
    });

    return this.prisma.complianceStatusProjection.findUniqueOrThrow({
      where: { id: projection.id },
      include: { indicators: true, alerts: true },
    });
  }

  async invalidateOnInstrumentChange(officialInstrumentId: string) {
    const projections = await this.prisma.complianceStatusProjection.findMany({
      where: { officialInstrumentId },
    });

    for (const projection of projections) {
      await this.prisma.complianceMonitoringEvent.create({
        data: {
          projectionId: projection.id,
          eventType: 'CACHE_INVALIDATED',
          eventSummary: 'Projection cache invalidated due to instrument lifecycle change',
          sourceDataRefs: [{ officialInstrumentId }],
        },
      });
    }

    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: officialInstrumentId },
    });

    if (!instrument) {
      return [];
    }

    return projections.map((projection) =>
      this.deriveProjection({
        audience: projection.audience,
        subjectIdentityId: projection.subjectIdentityId ?? undefined,
        subjectOfficeholderId: projection.subjectOfficeholderId ?? undefined,
        subjectDepartmentId: projection.subjectDepartmentId ?? undefined,
        subjectInstitutionId: projection.subjectInstitutionId ?? undefined,
        caseId: projection.caseId ?? undefined,
        masterAdministrativeFileId: projection.masterAdministrativeFileId ?? undefined,
        officialInstrumentId,
        functionAuthorityRecordId: projection.functionAuthorityRecordId ?? undefined,
        authorityEvaluationRecordId: projection.authorityEvaluationRecordId ?? undefined,
        underlyingAssessmentType: projection.underlyingAssessmentType ?? undefined,
        underlyingAssessmentId: projection.underlyingAssessmentId ?? undefined,
        evidenceCutoffAt: projection.evidenceCutoffAt ?? undefined,
      }),
    );
  }

  private async findExistingProjection(input: DeriveComplianceProjectionInput) {
    return this.prisma.complianceStatusProjection.findFirst({
      where: {
        audience: input.audience,
        subjectIdentityId: input.subjectIdentityId ?? null,
        subjectOfficeholderId: input.subjectOfficeholderId ?? null,
        subjectDepartmentId: input.subjectDepartmentId ?? null,
        caseId: input.caseId ?? null,
        officialInstrumentId: input.officialInstrumentId ?? null,
      },
      orderBy: { lastDerivedAt: 'desc' },
    });
  }

  private async buildSourceSnapshot(
    input: DeriveComplianceProjectionInput,
  ): Promise<ComplianceSourceSnapshot> {
    const openFindingRefs: { type: string; id: string }[] = [];
    const openCorrectiveActionRefs: { type: string; id: string }[] = [];
    const indicators: ComplianceSourceSnapshot['indicators'] = [];

    let instrumentStatusSnapshot: string | null = null;
    let status: ComplianceProjectionStatus = ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT;

    if (input.caseId) {
      const inspections = await this.prisma.inspectionRecord.findMany({
        where: { caseId: input.caseId },
        include: { evidenceItems: true },
      });

      const openInspections = inspections.filter(
        (record) =>
          record.status === InspectionStatus.SCHEDULED ||
          record.status === InspectionStatus.IN_PROGRESS,
      );
      const completedWithFollowUp = inspections.filter(
        (record) => record.followUpRequired && record.status === InspectionStatus.COMPLETED,
      );

      for (const inspection of inspections) {
        for (const item of inspection.evidenceItems) {
          if (item.findingClassification !== 'OBSERVATION') {
            openFindingRefs.push({ type: 'InspectionEvidenceItem', id: item.id });
          }
        }
      }

      const openFindings = openFindingRefs.length;
      if (openFindings > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.OPEN_FINDINGS,
          displayLabel: 'Open findings',
          countValue: openFindings,
          drillDownReferences: openFindingRefs,
        });
      }

      if (openInspections.length > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.UPCOMING_INSPECTIONS,
          displayLabel: 'Upcoming inspections',
          countValue: openInspections.length,
          drillDownReferences: openInspections.map((record) => ({
            type: 'InspectionRecord',
            id: record.id,
          })),
        });
        status = ComplianceProjectionStatus.UNDER_INSPECTION;
      }

      if (completedWithFollowUp.length > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.REINSPECTION_REQUIRED,
          displayLabel: 'Reinspection required',
          countValue: completedWithFollowUp.length,
          drillDownReferences: completedWithFollowUp.map((record) => ({
            type: 'InspectionRecord',
            id: record.id,
          })),
        });
      }

      const conditions = await this.prisma.decisionCondition.findMany({
        where: {
          governmentDecision: { caseId: input.caseId },
          status: 'PENDING',
          conditionType: 'ONGOING',
        },
      });

      if (conditions.length > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.OBLIGATIONS_DUE,
          displayLabel: 'Obligations due',
          countValue: conditions.length,
          drillDownReferences: conditions.map((condition) => ({
            type: 'DecisionCondition',
            id: condition.id,
          })),
        });
        if (status === ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT) {
          status = ComplianceProjectionStatus.MONITORING;
        }
      }
    }

    const matterScope: Prisma.ComplianceMatterWhereInput = {};
    if (input.caseId) {
      matterScope.caseId = input.caseId;
    }
    if (input.officialInstrumentId) {
      matterScope.officialInstrumentId = input.officialInstrumentId;
    }
    if (input.masterAdministrativeFileId) {
      matterScope.masterAdministrativeFileId = input.masterAdministrativeFileId;
    }

    if (Object.keys(matterScope).length > 0) {
      const continuingObligations = await this.prisma.continuingObligation.findMany({
        where: { complianceMatter: matterScope },
      });

      const dueStatuses: ContinuingObligationStatus[] = [
        ContinuingObligationStatus.NOT_YET_DUE,
        ContinuingObligationStatus.DUE,
        ContinuingObligationStatus.SUBMITTED,
        ContinuingObligationStatus.UNDER_REVIEW,
      ];
      const dueObligations = continuingObligations.filter((obligation) =>
        dueStatuses.includes(obligation.status),
      );
      const overdueObligations = continuingObligations.filter(
        (obligation) => obligation.status === ContinuingObligationStatus.OVERDUE,
      );

      if (dueObligations.length > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.OBLIGATIONS_DUE,
          displayLabel: 'Continuing obligations due',
          countValue: dueObligations.length,
          drillDownReferences: dueObligations.map((obligation) => ({
            type: 'ContinuingObligation',
            id: obligation.id,
          })),
        });
        if (status === ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT) {
          status = ComplianceProjectionStatus.MONITORING;
        }
      }

      if (overdueObligations.length > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.OBLIGATIONS_OVERDUE,
          displayLabel: 'Continuing obligations overdue',
          countValue: overdueObligations.length,
          drillDownReferences: overdueObligations.map((obligation) => ({
            type: 'ContinuingObligation',
            id: obligation.id,
          })),
        });
        if (
          status === ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT ||
          status === ComplianceProjectionStatus.MONITORING
        ) {
          status = ComplianceProjectionStatus.ACTION_REQUIRED;
        }
      }
    }

    if (input.officialInstrumentId) {
      const instrument = await this.prisma.officialInstrument.findUnique({
        where: { id: input.officialInstrumentId },
      });
      if (!instrument) {
        throw new NotFoundException(`OfficialInstrument ${input.officialInstrumentId} not found`);
      }

      instrumentStatusSnapshot = instrument.lifecycleStatus ?? instrument.status;
      status = this.applyInstrumentStatusProjection(status, instrument.status, instrument.lifecycleStatus);

      if (instrument.effectiveUntil && instrument.effectiveUntil <= new Date()) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.EXPIRING_INSTRUMENT,
          displayLabel: 'Expiring instrument',
          countValue: 1,
          drillDownReferences: [{ type: 'OfficialInstrument', id: instrument.id }],
        });
      }
    }

    if (input.caseId) {
      const expiredEvidence = await this.prisma.evidenceRecord.findMany({
        where: {
          caseId: input.caseId,
          validUntil: { lte: new Date() },
        },
      });

      if (expiredEvidence.length > 0) {
        indicators.push({
          indicatorType: ComplianceIndicatorType.EXPIRING_EVIDENCE,
          displayLabel: 'Expired evidence',
          countValue: expiredEvidence.length,
          drillDownReferences: expiredEvidence.map((record) => ({
            type: 'EvidenceRecord',
            id: record.id,
          })),
        });
        if (
          status === ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT ||
          status === ComplianceProjectionStatus.MONITORING
        ) {
          status = ComplianceProjectionStatus.ACTION_REQUIRED;
        }
      }
    }

    if (input.underlyingAssessmentId) {
      if (status === ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT) {
        status = ComplianceProjectionStatus.MONITORING;
      }
    }

    if (openCorrectiveActionRefs.length > 0) {
      indicators.push({
        indicatorType: ComplianceIndicatorType.CORRECTIVE_ACTIONS_OVERDUE,
        displayLabel: 'Corrective actions overdue',
        countValue: openCorrectiveActionRefs.length,
        drillDownReferences: openCorrectiveActionRefs,
      });
      status = ComplianceProjectionStatus.UNDER_CORRECTIVE_ACTION;
    }

    if (status === ComplianceProjectionStatus.NO_CURRENT_ASSESSMENT && indicators.length > 0) {
      status = ComplianceProjectionStatus.MONITORING;
    }

    return {
      openFindingRefs,
      openCorrectiveActionRefs,
      instrumentStatusSnapshot,
      status,
      indicators,
    };
  }

  private applyInstrumentStatusProjection(
    currentStatus: ComplianceProjectionStatus,
    issuanceStatus: OfficialInstrumentStatus,
    lifecycleStatus: InstrumentLifecycleStatus,
  ): ComplianceProjectionStatus {
    if (
      issuanceStatus === OfficialInstrumentStatus.SUSPENDED ||
      lifecycleStatus === InstrumentLifecycleStatus.SUSPENDED ||
      lifecycleStatus === InstrumentLifecycleStatus.PARTIALLY_SUSPENDED
    ) {
      return ComplianceProjectionStatus.SUSPENDED_BY_SEPARATE_DECISION;
    }

    if (
      issuanceStatus === OfficialInstrumentStatus.REVOKED ||
      lifecycleStatus === InstrumentLifecycleStatus.REVOKED ||
      lifecycleStatus === InstrumentLifecycleStatus.REVOCATION_DECIDED
    ) {
      return ComplianceProjectionStatus.REVOKED_BY_SEPARATE_DECISION;
    }

    if (
      issuanceStatus === OfficialInstrumentStatus.EXPIRED ||
      lifecycleStatus === InstrumentLifecycleStatus.EXPIRED
    ) {
      return ComplianceProjectionStatus.EXPIRED;
    }

    return currentStatus;
  }
}
