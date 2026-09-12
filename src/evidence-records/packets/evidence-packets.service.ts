import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EvidencePacketStatus,
  EvidencePurposeType,
  EvidenceStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import {
  generateEvidenceReferenceNumber,
  hashContent,
} from '../common/reference-number.util';
import { PACKET_REFERENCE_PREFIX } from '../evidence-records.constants';
import { MasterFilesService } from '../master-files/master-files.service';

@Injectable()
export class EvidencePacketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
    private readonly masterFiles: MasterFilesService,
  ) {}

  async create(input: {
    masterAdministrativeFileId: string;
    actorIdentityId: string;
    isOfficial: boolean;
    title: string;
    clientPayload?: Record<string, unknown>;
  }) {
    if (input.clientPayload) {
      this.boundary.assertClientCannotSetSealed(input.clientPayload);
    }

    await this.masterFiles.assertAccess(
      input.masterAdministrativeFileId,
      input.actorIdentityId,
      input.isOfficial,
    );

    return this.prisma.evidencePacket.create({
      data: {
        packetReference: generateEvidenceReferenceNumber(PACKET_REFERENCE_PREFIX),
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        title: input.title,
        status: EvidencePacketStatus.DRAFT,
      },
    });
  }

  async addEvidence(input: {
    packetId: string;
    evidenceRecordId: string;
    actorIdentityId: string;
    isOfficial: boolean;
    sequenceNumber: number;
    purposeType?: EvidencePurposeType;
  }) {
    const packet = await this.getPacket(input.packetId);
    this.boundary.assertPacketNotSealed(packet.status);

    const evidence = await this.prisma.evidenceRecord.findUnique({
      where: { id: input.evidenceRecordId },
      include: { purposeAcceptances: true },
    });
    if (!evidence) {
      throw new NotFoundException('Evidence record not found');
    }

    this.boundary.assertNotQuarantined(evidence.status);

    if (input.purposeType === EvidencePurposeType.DECISION_SUPPORT) {
      if (evidence.status !== EvidenceStatus.ACCEPTED) {
        throw new BadRequestException({
          message: 'Decision-support packet cannot include non-accepted evidence',
          code: 'NON_ACCEPTED_EVIDENCE_IN_DECISION_PACKET',
        });
      }
    }

    let version = packet.versions[0];
    if (!version) {
      const createdVersion = await this.prisma.evidencePacketVersion.create({
        data: {
          evidencePacketId: input.packetId,
          versionNumber: 1,
          manifestHash: '',
        },
      });
      version = { ...createdVersion, items: [], manifest: null };
    }

    return this.prisma.evidencePacketItem.create({
      data: {
        evidencePacketVersionId: version!.id,
        evidenceRecordId: input.evidenceRecordId,
        sequenceNumber: input.sequenceNumber,
      },
    });
  }

  async freeze(input: {
    packetId: string;
    actorIdentityId: string;
    isOfficial: boolean;
  }) {
    const packet = await this.getPacket(input.packetId);
    this.boundary.assertPacketFreezeIrreversible(packet.status);

    const version = packet.versions[0];
    if (!version) {
      throw new BadRequestException('Packet has no items to freeze');
    }

    const items = await this.prisma.evidencePacketItem.findMany({
      where: { evidencePacketVersionId: version.id },
      orderBy: { sequenceNumber: 'asc' },
    });

    const manifestPayload = {
      packetId: input.packetId,
      items: items.map((item) => ({
        evidenceRecordId: item.evidenceRecordId,
        sequenceNumber: item.sequenceNumber,
      })),
    };
    const contentHash = hashContent(JSON.stringify(manifestPayload));

    await this.prisma.evidencePacketManifest.create({
      data: {
        evidencePacketVersionId: version.id,
        manifestReference: generateEvidenceReferenceNumber('MNF'),
        manifestPayload,
        contentHash,
      },
    });

    await this.prisma.evidencePacketVersion.update({
      where: { id: version.id },
      data: { manifestHash: contentHash },
    });

    const sealed = await this.prisma.evidencePacket.update({
      where: { id: input.packetId },
      data: {
        status: EvidencePacketStatus.SEALED,
        sealedAt: new Date(),
      },
      include: { versions: { include: { manifest: true, items: true } } },
    });

    if (packet.masterAdministrativeFile?.caseId) {
      await this.prisma.case.update({
        where: { id: packet.masterAdministrativeFile.caseId },
        data: { evidencePacketReference: sealed.packetReference },
      });
    }

    await this.boundary.assertPhase7TablesAbsent();

    return sealed;
  }

  async findById(packetId: string, actorIdentityId: string, isOfficial: boolean) {
    if (!isOfficial) {
      await this.boundary.assertApplicantCanAccessPacket(packetId, actorIdentityId);
    }
    return this.getPacket(packetId);
  }

  private async getPacket(packetId: string) {
    const packet = await this.prisma.evidencePacket.findUnique({
      where: { id: packetId },
      include: {
        masterAdministrativeFile: true,
        versions: { include: { items: true, manifest: true } },
      },
    });
    if (!packet) {
      throw new NotFoundException('Evidence packet not found');
    }
    return packet;
  }
}
