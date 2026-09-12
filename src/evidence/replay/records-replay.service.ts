import { Injectable, NotFoundException } from '@nestjs/common';
import { RecordsReplayMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface ReplayRequest {
  caseId: string;
  asOf: Date;
  mode: RecordsReplayMode;
}

export interface ReplaySnapshot {
  mode: RecordsReplayMode;
  asOf: Date;
  masterAdministrativeFile: unknown | null;
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
        versions: { where: { supersededAt: null }, orderBy: { versionNumber: 'desc' }, take: 1 },
        documents: {
          include: {
            versions: { where: { supersededAt: null }, orderBy: { versionNumber: 'desc' } },
          },
        },
        evidenceItems: true,
        reviews: true,
        governmentResponses: { where: { supersededAt: null } },
        professionalFindings: { where: { supersededAt: null } },
        evidencePackets: {
          include: {
            versions: { where: { supersededAt: null }, orderBy: { versionNumber: 'desc' } },
          },
        },
      },
    });

    const caseRecord = await this.prisma.case.findUniqueOrThrow({
      where: { id: request.caseId },
      include: {
        workflowInstances: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const activeWorkflow = caseRecord.workflowInstances[0];

    return {
      mode: RecordsReplayMode.CURRENT_VIEW,
      asOf: request.asOf,
      masterAdministrativeFile: maf.versions[0] ?? null,
      documentVersions: maf.documents.flatMap((doc) => doc.versions),
      evidenceStatuses: maf.evidenceItems,
      reviews: maf.reviews,
      governmentResponses: maf.governmentResponses,
      professionalFindings: maf.professionalFindings,
      workflowVersions: activeWorkflow
        ? [{ workflowVersionReference: activeWorkflow.workflowVersionReference }]
        : [],
      authorityReferences: this.extractAuthorityReferences(maf),
      frozenEvidencePacketVersions: maf.evidencePackets.flatMap((packet) => packet.versions),
    };
  }

  private async buildHistoricalReplay(
    mafId: string,
    request: ReplayRequest,
  ): Promise<ReplaySnapshot> {
    const asOf = request.asOf;

    const mafVersion = await this.prisma.masterAdministrativeFileVersion.findFirst({
      where: {
        masterAdministrativeFileId: mafId,
        effectiveAt: { lte: asOf },
        OR: [{ supersededAt: null }, { supersededAt: { gt: asOf } }],
      },
      orderBy: { versionNumber: 'desc' },
    });

    const documentVersions = await this.prisma.evidenceDocumentVersion.findMany({
      where: {
        effectiveAt: { lte: asOf },
        OR: [{ supersededAt: null }, { supersededAt: { gt: asOf } }],
        document: { masterAdministrativeFileId: mafId },
      },
      orderBy: [{ documentId: 'asc' }, { versionNumber: 'desc' }],
    });

    const evidenceStatuses = await this.prisma.evidenceItemStatusHistory.findMany({
      where: {
        evidenceItem: { masterAdministrativeFileId: mafId },
        changedAt: { lte: asOf },
      },
      orderBy: { changedAt: 'asc' },
    });

    const reviews = await this.prisma.evidenceReview.findMany({
      where: {
        masterAdministrativeFileId: mafId,
        createdAt: { lte: asOf },
        OR: [{ completedAt: null }, { completedAt: { lte: asOf } }],
      },
    });

    const governmentResponses = await this.prisma.governmentResponse.findMany({
      where: {
        masterAdministrativeFileId: mafId,
        createdAt: { lte: asOf },
        OR: [{ supersededAt: null }, { supersededAt: { gt: asOf } }],
      },
    });

    const professionalFindings = await this.prisma.professionalFinding.findMany({
      where: {
        masterAdministrativeFileId: mafId,
        createdAt: { lte: asOf },
        OR: [{ supersededAt: null }, { supersededAt: { gt: asOf } }],
      },
    });

    const frozenEvidencePacketVersions = await this.prisma.evidencePacketVersion.findMany({
      where: {
        frozenAt: { lte: asOf },
        OR: [{ supersededAt: null }, { supersededAt: { gt: asOf } }],
        packet: { masterAdministrativeFileId: mafId },
      },
      orderBy: [{ packetId: 'asc' }, { versionNumber: 'desc' }],
    });

    const caseRecord = await this.prisma.case.findUniqueOrThrow({
      where: { id: request.caseId },
      include: {
        workflowInstances: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const activeWorkflow = caseRecord.workflowInstances[0];
    const workflowVersions =
      activeWorkflow && activeWorkflow.createdAt <= asOf
        ? [{ workflowVersionReference: activeWorkflow.workflowVersionReference }]
        : [];

    const currentView = await this.buildCurrentView(mafId, {
      ...request,
      mode: RecordsReplayMode.CURRENT_VIEW,
    });

    return {
      mode: RecordsReplayMode.HISTORICAL_REPLAY,
      asOf,
      masterAdministrativeFile: mafVersion,
      documentVersions,
      evidenceStatuses,
      reviews,
      governmentResponses,
      professionalFindings,
      workflowVersions,
      authorityReferences: frozenEvidencePacketVersions.flatMap((version) =>
        Array.isArray(version.authorityReferences)
          ? version.authorityReferences
          : [],
      ),
      frozenEvidencePacketVersions,
      ...(this.historicalDiffersFromCurrent(currentView, {
        masterAdministrativeFile: mafVersion,
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
      masterAdministrativeFile: unknown | null;
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

  private extractAuthorityReferences(maf: {
    evidencePackets: Array<{
      versions: Array<{ authorityReferences: unknown }>;
    }>;
  }): unknown[] {
    return maf.evidencePackets.flatMap((packet) =>
      packet.versions.flatMap((version) =>
        Array.isArray(version.authorityReferences) ? version.authorityReferences : [],
      ),
    );
  }
}
