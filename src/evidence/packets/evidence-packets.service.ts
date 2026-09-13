import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type EvidencePacket,
  type EvidencePacketVersion,
  EvidencePacketVersionStatus,
  EvidenceRecordStatus,
  GovernmentCommunicationCategory,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type CanonicalManifest, hashManifest } from '../common/manifest-hash.util';
import { buildQualitySummary } from '../common/quality-summary.util';
import {
  EVIDENCE_PACKET_NUMBER_PREFIX,
  FROZEN_PACKET_IMMUTABLE_MESSAGE,
  PACKET_BOUNDARY_DISCLAIMER,
} from '../evidence.constants';
import { AddPacketItemDto } from './dto/add-packet-item.dto';
import { AssemblePacketDto } from './dto/assemble-packet.dto';
import { CreateEvidencePacketDto } from './dto/create-evidence-packet.dto';
import { ExcludePacketItemDto } from './dto/exclude-packet-item.dto';
import { FreezePacketDto } from './dto/freeze-packet.dto';

const DRAFT_MUTABLE_STATUSES: EvidencePacketVersionStatus[] = [EvidencePacketVersionStatus.DRAFT];

const ADVERSE_EVIDENCE_STATUSES: EvidenceRecordStatus[] = [
  EvidenceRecordStatus.DISPUTED,
  EvidenceRecordStatus.EXPIRED,
  EvidenceRecordStatus.REJECTED_FOR_STATED_PURPOSE,
  EvidenceRecordStatus.INCOMPLETE,
  EvidenceRecordStatus.UNREADABLE,
];

const UNRESOLVED_GOVERNMENT_CATEGORIES: GovernmentCommunicationCategory[] = [
  GovernmentCommunicationCategory.OBJECTION,
  GovernmentCommunicationCategory.RETAINED_DETERMINATION,
];

const VERSION_INCLUDE = {
  items: {
    include: {
      documentVersion: true,
      evidenceRecord: true,
      verificationRecords: true,
      acceptanceRecords: true,
      exclusionRecord: true,
    },
    orderBy: { inclusionOrder: 'asc' },
  },
  exclusionRecords: true,
  manifest: true,
  packet: true,
} satisfies Prisma.EvidencePacketVersionInclude;

@Injectable()
export class EvidencePacketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPacket(
    actorIdentityId: string,
    dto: CreateEvidencePacketDto,
  ): Promise<EvidencePacket> {
    const packetNumber = await this.generatePacketNumber();

    return this.prisma.$transaction(async (tx) => {
      const packet = await tx.evidencePacket.create({
        data: {
          packetNumber,
          masterAdministrativeFileId: dto.masterAdministrativeFileId,
          caseId: dto.caseId,
          purpose: dto.purpose,
          questionOrIssue: dto.questionOrIssue,
          responsibleDepartmentId: dto.responsibleDepartmentId,
          externalProjectReference: dto.externalProjectReference,
        },
      });

      await tx.evidencePacketVersion.create({
        data: {
          packetId: packet.id,
          version: 1,
          status: EvidencePacketVersionStatus.DRAFT,
          assembledByIdentityId: actorIdentityId,
        },
      });

      return packet;
    });
  }

  async getPacket(packetId: string) {
    const packet = await this.prisma.evidencePacket.findUnique({
      where: { id: packetId },
      include: {
        versions: { orderBy: { version: 'desc' } },
        masterAdministrativeFile: true,
        responsibleDepartment: true,
      },
    });
    if (!packet) {
      throw new NotFoundException(`Evidence packet "${packetId}" was not found`);
    }
    return { ...packet, boundaryDisclaimer: PACKET_BOUNDARY_DISCLAIMER };
  }

  async getPacketVersion(versionId: string) {
    const version = await this.prisma.evidencePacketVersion.findUnique({
      where: { id: versionId },
      include: VERSION_INCLUDE,
    });
    if (!version) {
      throw new NotFoundException(`Evidence packet version "${versionId}" was not found`);
    }
    return this.withBoundaryMetadata(version);
  }

  async getLatestDraftVersion(packetId: string): Promise<EvidencePacketVersion> {
    const version = await this.prisma.evidencePacketVersion.findFirst({
      where: { packetId, status: EvidencePacketVersionStatus.DRAFT },
      orderBy: { version: 'desc' },
    });
    if (!version) {
      throw new NotFoundException(`No draft version exists for packet "${packetId}"`);
    }
    return version;
  }

  async addItem(packetId: string, dto: AddPacketItemDto) {
    const version = await this.getLatestDraftVersion(packetId);
    this.assertMutable(version.status);

    const evidenceRecord = await this.prisma.evidenceRecord.findUnique({
      where: { id: dto.evidenceRecordId },
    });
    if (!evidenceRecord) {
      throw new NotFoundException(`Evidence record "${dto.evidenceRecordId}" was not found`);
    }

    if (evidenceRecord.documentVersionId !== dto.documentVersionId) {
      throw new NotFoundException(
        `Document version "${dto.documentVersionId}" is not pinned to evidence record "${dto.evidenceRecordId}"`,
      );
    }
    const documentVersion = await this.prisma.documentVersion.findUnique({
      where: { id: dto.documentVersionId },
    });
    if (!documentVersion) {
      throw new NotFoundException(`Document version "${dto.documentVersionId}" was not found`);
    }

    const maxOrder = await this.prisma.evidencePacketItem.aggregate({
      where: { packetVersionId: version.id },
      _max: { inclusionOrder: true },
    });
    const inclusionOrder = dto.inclusionOrder ?? (maxOrder._max.inclusionOrder ?? -1) + 1;

    return this.prisma.evidencePacketItem.create({
      data: {
        packetVersionId: version.id,
        evidenceRecordId: dto.evidenceRecordId,
        evidenceStatusAtInclusion: evidenceRecord.status,
        documentVersionId: dto.documentVersionId,
        inclusionOrder,
        limitations: dto.limitations,
        departmentalReviewId: dto.departmentalReviewId,
        governmentCommunicationId: dto.governmentCommunicationId,
        professionalReviewId: dto.professionalReviewId,
        inspectionRecordId: dto.inspectionRecordId,
        verificationRecords: dto.verificationRecordIds
          ? { connect: dto.verificationRecordIds.map((id) => ({ id })) }
          : undefined,
        acceptanceRecords: dto.acceptanceRecordIds
          ? { connect: dto.acceptanceRecordIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        evidenceRecord: true,
        documentVersion: true,
      },
    });
  }

  async removeItem(packetId: string, itemId: string) {
    const version = await this.getLatestDraftVersion(packetId);
    this.assertMutable(version.status);

    const item = await this.prisma.evidencePacketItem.findFirst({
      where: { id: itemId, packetVersionId: version.id },
    });
    if (!item) {
      throw new NotFoundException(`Packet item "${itemId}" was not found in draft version`);
    }

    await this.prisma.evidencePacketItem.delete({ where: { id: itemId } });
    return { removed: true, itemId };
  }

  async excludeItem(packetId: string, actorIdentityId: string, dto: ExcludePacketItemDto) {
    const version = await this.getLatestDraftVersion(packetId);
    this.assertMutable(version.status);

    const evidenceRecord = await this.prisma.evidenceRecord.findUnique({
      where: { id: dto.evidenceRecordId },
      include: { documentVersion: true },
    });
    if (!evidenceRecord) {
      throw new NotFoundException(`Evidence record "${dto.evidenceRecordId}" was not found`);
    }

    const exclusion = await this.prisma.$transaction(async (tx) => {
      const exclusionRecord = await tx.evidencePacketItemExclusion.create({
        data: {
          packetVersionId: version.id,
          evidenceRecordId: dto.evidenceRecordId,
          exclusionReason: dto.exclusionReason,
          authorizedByIdentityId: actorIdentityId,
          authorizedByOfficeholderId: dto.authorizedByOfficeholderId,
          authorityEvaluationRecordId: dto.authorityEvaluationRecordId,
        },
      });

      const documentVersionId = evidenceRecord.documentVersionId;
      if (!documentVersionId) {
        throw new BadRequestException(
          'Cannot create controlled exclusion without a document version on the evidence record',
        );
      }

      const maxOrder = await tx.evidencePacketItem.aggregate({
        where: { packetVersionId: version.id },
        _max: { inclusionOrder: true },
      });

      await tx.evidencePacketItem.create({
        data: {
          packetVersionId: version.id,
          evidenceRecordId: dto.evidenceRecordId,
          evidenceStatusAtInclusion: evidenceRecord.status,
          documentVersionId,
          inclusionOrder: (maxOrder._max.inclusionOrder ?? -1) + 1,
          isExplicitlyExcluded: true,
          exclusionRecordId: exclusionRecord.id,
        },
      });

      return exclusionRecord;
    });

    return exclusion;
  }

  async assemble(packetId: string, actorIdentityId: string, dto: AssemblePacketDto) {
    const version = await this.getLatestDraftVersion(packetId);
    this.assertMutable(version.status);

    const validation = await this.validate(packetId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Packet assembly validation failed',
        issues: validation.issues,
      });
    }

    const qualitySummary = await this.buildVersionQualitySummary(version.id);

    return this.prisma.evidencePacketVersion.update({
      where: { id: version.id },
      data: {
        status: EvidencePacketVersionStatus.ASSEMBLED,
        evidenceCutoffAt: dto.evidenceCutoffAt ?? new Date(),
        assembledByIdentityId: actorIdentityId,
        assembledByOfficeholderId: dto.assembledByOfficeholderId,
        authorityEvaluationRecordId: dto.authorityEvaluationRecordId,
        qualitySummary: qualitySummary as unknown as Prisma.InputJsonValue,
      },
      include: VERSION_INCLUDE,
    });
  }

  async validate(packetId: string) {
    const version = await this.prisma.evidencePacketVersion.findFirst({
      where: { packetId },
      orderBy: { version: 'desc' },
      include: {
        items: { include: { evidenceRecord: true, exclusionRecord: true } },
        packet: true,
      },
    });
    if (!version) {
      throw new NotFoundException(`No version found for packet "${packetId}"`);
    }

    const issues: string[] = [];
    const includedRecordIds = new Set(
      version.items.filter((i) => !i.isExplicitlyExcluded).map((i) => i.evidenceRecordId),
    );
    const excludedRecordIds = new Set(
      version.items.filter((i) => i.isExplicitlyExcluded).map((i) => i.evidenceRecordId),
    );

    const fileRecords = await this.prisma.evidenceRecord.findMany({
      where: { masterAdministrativeFileId: version.packet.masterAdministrativeFileId },
      include: {
        governmentCommunicationEvidence: { include: { governmentCommunication: true } },
        professionalReviewEvidence: { include: { professionalReview: true } },
      },
    });

    for (const record of fileRecords) {
      const hasUnresolvedGovernment = record.governmentCommunicationEvidence.some((link) =>
        UNRESOLVED_GOVERNMENT_CATEGORIES.includes(link.governmentCommunication.category),
      );
      const hasMinorityOpinion = record.professionalReviewEvidence.some((link) =>
        Boolean(link.professionalReview.conflictDeclaration),
      );
      const mustSurface =
        ADVERSE_EVIDENCE_STATUSES.includes(record.status) ||
        hasUnresolvedGovernment ||
        hasMinorityOpinion;

      if (!mustSurface) {
        continue;
      }

      const isIncluded = includedRecordIds.has(record.id);
      const isExplicitlyExcluded = excludedRecordIds.has(record.id);

      if (!isIncluded && !isExplicitlyExcluded) {
        issues.push(
          `Adverse, disputed, expired, minority-opinion, or unresolved evidence record "${record.evidenceNumber}" is not included and has no controlled exclusion`,
        );
      }

      if (isIncluded && !isExplicitlyExcluded) {
        const item = version.items.find((i) => i.evidenceRecordId === record.id);
        if (item && item.evidenceStatusAtInclusion !== record.status) {
          issues.push(
            `Evidence record "${record.evidenceNumber}" status changed since inclusion; re-validate before freeze`,
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      boundaryDisclaimer: PACKET_BOUNDARY_DISCLAIMER,
    };
  }

  async freeze(packetId: string, dto: FreezePacketDto) {
    const version = await this.prisma.evidencePacketVersion.findFirst({
      where: {
        packetId,
        status: {
          in: [EvidencePacketVersionStatus.ASSEMBLED, EvidencePacketVersionStatus.UNDER_REVIEW],
        },
      },
      orderBy: { version: 'desc' },
      include: VERSION_INCLUDE,
    });

    if (!version) {
      throw new BadRequestException('Only assembled or under-review packet versions can be frozen');
    }

    const validation = await this.validate(packetId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Cannot freeze packet with validation issues',
        issues: validation.issues,
      });
    }

    const manifest = this.buildCanonicalManifest(version);
    const manifestHash = hashManifest(manifest);

    return this.prisma.$transaction(async (tx) => {
      await tx.evidencePacketManifest.create({
        data: {
          packetVersionId: version.id,
          canonicalManifest: manifest as unknown as Prisma.InputJsonValue,
          manifestHash,
        },
      });

      const frozen = await tx.evidencePacketVersion.update({
        where: { id: version.id },
        data: {
          status: EvidencePacketVersionStatus.FROZEN,
          frozenAt: new Date(),
          manifestHash,
          readyForDecisionReview: dto.readyForDecisionReview ?? false,
        },
        include: VERSION_INCLUDE,
      });

      if (version.packet.caseId) {
        await tx.case.update({
          where: { id: version.packet.caseId },
          data: { evidencePacketReference: version.packet.id },
        });
      }

      return this.withBoundaryMetadata(frozen);
    });
  }

  async createNewVersion(packetId: string, actorIdentityId: string) {
    const latest = await this.prisma.evidencePacketVersion.findFirst({
      where: { packetId },
      orderBy: { version: 'desc' },
    });
    if (!latest) {
      throw new NotFoundException(`No version found for packet "${packetId}"`);
    }
    if (latest.status !== EvidencePacketVersionStatus.FROZEN) {
      throw new BadRequestException('New versions can only be created from frozen packet versions');
    }

    return this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.evidencePacketVersion.create({
        data: {
          packetId,
          version: latest.version + 1,
          status: EvidencePacketVersionStatus.DRAFT,
          assembledByIdentityId: actorIdentityId,
        },
      });

      await tx.evidencePacketVersion.update({
        where: { id: latest.id },
        data: {
          status: EvidencePacketVersionStatus.SUPERSEDED,
          supersededById: newVersion.id,
        },
      });

      return newVersion;
    });
  }

  async compareVersions(versionIdA: string, versionIdB: string) {
    const [versionA, versionB] = await Promise.all([
      this.getPacketVersion(versionIdA),
      this.getPacketVersion(versionIdB),
    ]);

    if (versionA.packetId !== versionB.packetId) {
      throw new BadRequestException('Versions must belong to the same evidence packet');
    }

    const itemsA = new Map(versionA.items.map((i) => [i.evidenceRecordId, i]));
    const itemsB = new Map(versionB.items.map((i) => [i.evidenceRecordId, i]));

    const added = versionB.items.filter((i) => !itemsA.has(i.evidenceRecordId));
    const removed = versionA.items.filter((i) => !itemsB.has(i.evidenceRecordId));
    const changed = versionB.items.filter((i) => {
      const prior = itemsA.get(i.evidenceRecordId);
      return (
        prior &&
        (prior.documentVersionId !== i.documentVersionId ||
          prior.evidenceStatusAtInclusion !== i.evidenceStatusAtInclusion ||
          prior.isExplicitlyExcluded !== i.isExplicitlyExcluded)
      );
    });

    return {
      versionA: { id: versionA.id, version: versionA.version, manifestHash: versionA.manifestHash },
      versionB: { id: versionB.id, version: versionB.version, manifestHash: versionB.manifestHash },
      manifestHashChanged: versionA.manifestHash !== versionB.manifestHash,
      added,
      removed,
      changed,
      boundaryDisclaimer: PACKET_BOUNDARY_DISCLAIMER,
    };
  }

  async assertNotFrozen(versionId: string): Promise<void> {
    const version = await this.prisma.evidencePacketVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(`Evidence packet version "${versionId}" was not found`);
    }
    if (version.status === EvidencePacketVersionStatus.FROZEN) {
      throw new ConflictException(FROZEN_PACKET_IMMUTABLE_MESSAGE);
    }
  }

  private assertMutable(status: EvidencePacketVersionStatus): void {
    if (!DRAFT_MUTABLE_STATUSES.includes(status)) {
      throw new ConflictException(FROZEN_PACKET_IMMUTABLE_MESSAGE);
    }
  }

  private async buildVersionQualitySummary(versionId: string) {
    const items = await this.prisma.evidencePacketItem.findMany({
      where: { packetVersionId: versionId, isExplicitlyExcluded: false },
      include: {
        evidenceRecord: {
          include: { qualityAssessments: { orderBy: { assessedAt: 'desc' } } },
        },
      },
    });

    const assessments = items.flatMap((item) =>
      item.evidenceRecord.qualityAssessments.map((a) => ({
        criterion: a.criterion,
        rating: a.rating,
        limitations: a.limitations,
        notes: a.notes,
      })),
    );

    return buildQualitySummary(assessments);
  }

  private buildCanonicalManifest(
    version: Prisma.EvidencePacketVersionGetPayload<{ include: typeof VERSION_INCLUDE }>,
  ): CanonicalManifest {
    return {
      packetVersionId: version.id,
      packetId: version.packetId,
      version: version.version,
      evidenceCutoffAt: version.evidenceCutoffAt?.toISOString() ?? null,
      items: version.items.map((item) => ({
        itemId: item.id,
        evidenceRecordId: item.evidenceRecordId,
        evidenceStatusAtInclusion: item.evidenceStatusAtInclusion,
        documentVersionId: item.documentVersionId,
        documentContentHash: item.documentVersion.sha256,
        inclusionOrder: item.inclusionOrder,
        isExplicitlyExcluded: item.isExplicitlyExcluded,
        exclusionRecordId: item.exclusionRecordId,
        verificationRecordIds: item.verificationRecords.map((r) => r.id),
        acceptanceRecordIds: item.acceptanceRecords.map((r) => r.id),
        departmentalReviewId: item.departmentalReviewId,
        governmentCommunicationId: item.governmentCommunicationId,
        professionalReviewId: item.professionalReviewId,
        inspectionRecordId: item.inspectionRecordId,
        limitations: item.limitations,
      })),
      exclusions: version.exclusionRecords.map((e) => ({
        exclusionId: e.id,
        evidenceRecordId: e.evidenceRecordId,
        exclusionReason: e.exclusionReason,
        authorizedByIdentityId: e.authorizedByIdentityId,
      })),
    };
  }

  private withBoundaryMetadata<T extends EvidencePacketVersion>(version: T) {
    return {
      ...version,
      boundaryDisclaimer: PACKET_BOUNDARY_DISCLAIMER,
      inclusionDoesNotProveAuthenticity: true,
      freezeDoesNotConstituteApproval: true,
    };
  }

  private async generatePacketNumber(): Promise<string> {
    const count = await this.prisma.evidencePacket.count();
    const year = new Date().getFullYear();
    return `${EVIDENCE_PACKET_NUMBER_PREFIX}-${String(year)}-${String(count + 1).padStart(6, '0')}`;
  }
}
