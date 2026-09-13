import { Injectable, NotFoundException } from '@nestjs/common';
import { EvidencePacketVersionStatus, RecordsReplayMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ReplayRequest {
  caseId: string;
  asOf: Date;
  mode: RecordsReplayMode;
}

export interface ReplaySnapshot {
  mode: RecordsReplayMode;
  asOf: Date;
  masterAdministrativeFile: unknown;
  documentVersions: unknown[];
  evidenceStatuses: unknown[];
  reviews: unknown[];
  governmentResponses: unknown[];
  professionalFindings: unknown[];
  workflowVersions: unknown[];
  authorityReferences: unknown[];
  frozenEvidencePacketVersions: unknown[];
}

@Injectable()
export class RecordsReplayService {
  constructor(private readonly prisma: PrismaService) {}

  async replay(request: ReplayRequest): Promise<ReplaySnapshot> {
    const maf = await this.prisma.masterAdministrativeFile.findUnique({
      where: { caseId: request.caseId },
    });

    if (!maf) {
      throw new NotFoundException(`No master administrative file for case "${request.caseId}"`);
    }

    if (request.mode === RecordsReplayMode.CURRENT_VIEW) {
      return this.buildCurrentView(maf.id, request);
    }

    return this.buildHistoricalReplay(maf.id, request);
  }

  private async buildCurrentView(
    mafId: string,
    request: ReplayRequest,
  ): Promise<ReplaySnapshot> {
    const maf = await this.prisma.masterAdministrativeFile.findUniqueOrThrow({
      where: { id: mafId },
      include: {
        evidenceRecords: true,
        evidencePackets: {
          include: {
            versions: {
              where: { supersededById: null },
              orderBy: { version: 'desc' },
            },
          },
        },
      },
    });

    const documentVersions = await this.prisma.documentVersion.findMany({
      where: {
        supersededById: null,
        documentRecord: {
          associations: {
            some: {
              targetType: 'CASE',
              targetId: request.caseId,
            },
          },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });

    const reviews = await this.prisma.departmentalReviewRecord.findMany({
      where: { caseId: request.caseId },
    });

    const governmentResponses = await this.prisma.governmentCommunicationRecord.findMany({
      where: { caseId: request.caseId },
    });

    const professionalFindings = await this.prisma.professionalReviewRecord.findMany({
      where: { caseId: request.caseId },
    });

    const caseRecord = await this.prisma.case.findUniqueOrThrow({
      where: { id: request.caseId },
      include: {
        workflowVersion: true,
        workflowInstance: true,
      },
    });

    return {
      mode: RecordsReplayMode.CURRENT_VIEW,
      asOf: request.asOf,
      masterAdministrativeFile: maf,
      documentVersions,
      evidenceStatuses: maf.evidenceRecords,
      reviews,
      governmentResponses,
      professionalFindings,
      workflowVersions: [caseRecord.workflowVersion],
      authorityReferences: this.extractAuthorityReferences(maf.evidencePackets),
      frozenEvidencePacketVersions: maf.evidencePackets.flatMap((packet) =>
        packet.versions.filter((version) => version.status === EvidencePacketVersionStatus.FROZEN),
      ),
    };
  }

  private async buildHistoricalReplay(
    mafId: string,
    request: ReplayRequest,
  ): Promise<ReplaySnapshot> {
    const asOf = request.asOf;

    const maf = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: mafId },
    });

    const documentVersions = await this.prisma.documentVersion.findMany({
      where: {
        createdAt: { lte: asOf },
        documentRecord: {
          associations: {
            some: {
              targetType: 'CASE',
              targetId: request.caseId,
            },
          },
        },
      },
      orderBy: [{ documentRecordId: 'asc' }, { versionNumber: 'desc' }],
    });

    const evidenceStatuses = await this.prisma.evidenceRecord.findMany({
      where: {
        masterAdministrativeFileId: mafId,
        createdAt: { lte: asOf },
      },
      orderBy: { createdAt: 'asc' },
    });

    const reviews = await this.prisma.departmentalReviewRecord.findMany({
      where: {
        caseId: request.caseId,
        createdAt: { lte: asOf },
      },
    });

    const governmentResponses = await this.prisma.governmentCommunicationRecord.findMany({
      where: {
        caseId: request.caseId,
        createdAt: { lte: asOf },
      },
    });

    const professionalFindings = await this.prisma.professionalReviewRecord.findMany({
      where: {
        caseId: request.caseId,
        createdAt: { lte: asOf },
      },
    });

    const frozenEvidencePacketVersions = await this.prisma.evidencePacketVersion.findMany({
      where: {
        frozenAt: { lte: asOf },
        status: { in: [EvidencePacketVersionStatus.FROZEN, EvidencePacketVersionStatus.SUPERSEDED] },
        packet: { masterAdministrativeFileId: mafId },
      },
      orderBy: [{ packetId: 'asc' }, { version: 'desc' }],
    });

    const caseRecord = await this.prisma.case.findUniqueOrThrow({
      where: { id: request.caseId },
      include: {
        workflowVersion: true,
        workflowInstance: true,
      },
    });

    const workflowVersions =
      caseRecord.openedAt <= asOf ? [caseRecord.workflowVersion] : [];

    const currentView = await this.buildCurrentView(mafId, {
      ...request,
      mode: RecordsReplayMode.CURRENT_VIEW,
    });

    return {
      mode: RecordsReplayMode.HISTORICAL_REPLAY,
      asOf,
      masterAdministrativeFile: maf && maf.openedAt <= asOf ? maf : null,
      documentVersions,
      evidenceStatuses,
      reviews,
      governmentResponses,
      professionalFindings,
      workflowVersions,
      authorityReferences: frozenEvidencePacketVersions
        .filter((version) => version.authorityEvaluationRecordId)
        .map((version) => ({ authorityEvaluationRecordId: version.authorityEvaluationRecordId })),
      frozenEvidencePacketVersions,
      ...(this.historicalDiffersFromCurrent(currentView, {
        masterAdministrativeFile: maf && maf.openedAt <= asOf ? maf : null,
        documentVersions,
        evidenceStatuses,
      })
        ? {}
        : {}),
    };
  }

  private historicalDiffersFromCurrent(
    current: ReplaySnapshot,
    historical: {
      masterAdministrativeFile: unknown;
      documentVersions: unknown[];
      evidenceStatuses: unknown[];
    },
  ): boolean {
    return (
      JSON.stringify(current.masterAdministrativeFile) !==
        JSON.stringify(historical.masterAdministrativeFile) ||
      JSON.stringify(current.documentVersions) !== JSON.stringify(historical.documentVersions) ||
      JSON.stringify(current.evidenceStatuses) !== JSON.stringify(historical.evidenceStatuses)
    );
  }

  private extractAuthorityReferences(
    evidencePackets: {
      versions: { authorityEvaluationRecordId: string | null }[];
    }[],
  ): unknown[] {
    return evidencePackets.flatMap((packet) =>
      packet.versions
        .filter((version) => version.authorityEvaluationRecordId)
        .map((version) => ({
          authorityEvaluationRecordId: version.authorityEvaluationRecordId,
        })),
    );
  }
}
