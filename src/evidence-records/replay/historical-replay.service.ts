import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export interface HistoricalReplaySnapshot {
  asOf: Date;
  masterAdministrativeFileId: string;
  fileReference: string;
  documents: {
    id: string;
    documentReference: string;
    title: string;
    versions: {
      id: string;
      versionNumber: number;
      contentHash: string;
      registeredAt: Date;
      supersededAt: Date | null;
    }[];
  }[];
  evidence: {
    id: string;
    evidenceReference: string;
    title: string;
    status: string;
    receivedAt: Date;
    verifications: {
      id: string;
      status: string;
      verifiedAt: Date | null;
    }[];
    purposeAcceptances: {
      purposeType: string;
      acceptedAt: Date | null;
    }[];
    custodyEvents: {
      eventType: string;
      occurredAt: Date;
    }[];
  }[];
  packets: {
    id: string;
    packetReference: string;
    status: string;
    sealedAt: Date | null;
    versions: {
      versionNumber: number;
      manifestHash: string;
      items: { evidenceRecordId: string; sequenceNumber: number }[];
    }[];
  }[];
}

@Injectable()
export class HistoricalReplayService {
  constructor(private readonly prisma: PrismaService) {}

  async reconstructAt(
    masterAdministrativeFileId: string,
    asOf: Date,
  ): Promise<HistoricalReplaySnapshot> {
    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: masterAdministrativeFileId },
      include: {
        documents: {
          include: {
            versions: {
              where: { registeredAt: { lte: asOf } },
              orderBy: { versionNumber: 'asc' },
            },
          },
        },
        evidenceRecords: {
          where: { receivedAt: { lte: asOf } },
          include: {
            verifications: { where: { createdAt: { lte: asOf } } },
            purposeAcceptances: { where: { createdAt: { lte: asOf } } },
            custodyEvents: { where: { occurredAt: { lte: asOf } }, orderBy: { occurredAt: 'asc' } },
          },
        },
        packets: {
          where: { createdAt: { lte: asOf } },
          include: {
            versions: {
              where: { createdAt: { lte: asOf } },
              include: { items: true },
              orderBy: { versionNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!masterFile) {
      throw new NotFoundException(
        `Master administrative file "${masterAdministrativeFileId}" was not found`,
      );
    }

    return {
      asOf,
      masterAdministrativeFileId: masterFile.id,
      fileReference: masterFile.fileReference,
      documents: masterFile.documents.map((doc) => ({
        id: doc.id,
        documentReference: doc.documentReference,
        title: doc.title,
        versions: doc.versions
          .filter((version) => !version.supersededAt || version.supersededAt > asOf)
          .map((version) => ({
            id: version.id,
            versionNumber: version.versionNumber,
            contentHash: version.contentHash,
            registeredAt: version.registeredAt,
            supersededAt: version.supersededAt,
          })),
      })),
      evidence: masterFile.evidenceRecords.map((item) => ({
        id: item.id,
        evidenceReference: item.evidenceReference,
        title: item.title,
        status: item.status,
        receivedAt: item.receivedAt,
        verifications: item.verifications.map((v) => ({
          id: v.id,
          status: v.status,
          verifiedAt: v.verifiedAt,
        })),
        purposeAcceptances: item.purposeAcceptances.map((a) => ({
          purposeType: a.purposeType,
          acceptedAt: a.acceptedAt,
        })),
        custodyEvents: item.custodyEvents.map((e) => ({
          eventType: e.eventType,
          occurredAt: e.occurredAt,
        })),
      })),
      packets: masterFile.packets.map((packet) => ({
        id: packet.id,
        packetReference: packet.packetReference,
        status: packet.status,
        sealedAt: packet.sealedAt,
        versions: packet.versions.map((version) => ({
          versionNumber: version.versionNumber,
          manifestHash: version.manifestHash,
          items: version.items.map((item) => ({
            evidenceRecordId: item.evidenceRecordId,
            sequenceNumber: item.sequenceNumber,
          })),
        })),
      })),
    };
  }
}
