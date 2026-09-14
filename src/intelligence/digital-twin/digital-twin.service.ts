import { createHash } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DigitalTwinDefinitionStatus,
  DigitalTwinMode,
  DigitalTwinPrivacyClassification,
  DigitalTwinRelationshipType,
  DigitalTwinSourceStatus,
  DigitalTwinType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateDigitalTwinDefinitionInput {
  twinCode: string;
  representedSubjectType: DigitalTwinType;
  representedSubjectId: string;
  representedSubjectReference: string;
  institutionalOwnerId: string;
  institutionalOwnerOfficeholderId?: string;
  purpose: string;
  scope: string;
  permittedUses?: string[];
  prohibitedUses?: string[];
  sourceRequirements: string;
  privacyClassification?: DigitalTwinPrivacyClassification;
  preventsPersonalProfileExpansion?: boolean;
}

export interface CreateDigitalTwinVersionInput {
  definitionId: string;
  versionLabel: string;
  configuration?: Prisma.InputJsonValue;
  modelVersionReference?: string;
  setCurrent?: boolean;
}

export interface CreateDigitalTwinSourceInput {
  twinVersionId: string;
  sourceName: string;
  sourceStatus: DigitalTwinSourceStatus;
  integrationReference: string;
  evidenceReference?: string;
  freshnessAsOf: Date;
  ownerIdentityId?: string;
  ownerOfficeholderId?: string;
  limitations: string;
  isDisclosed?: boolean;
}

export interface CreateDigitalTwinRelationshipInput {
  fromDefinitionId: string;
  toDefinitionId: string;
  relationshipType: DigitalTwinRelationshipType;
  notes?: string;
}

export interface RecordDigitalTwinModeInput {
  twinVersionId: string;
  mode: DigitalTwinMode;
  recordedByIdentityId?: string;
  rationale: string;
}

export interface CreateDigitalTwinSnapshotInput {
  twinVersionId: string;
  snapshotPayload: Prisma.InputJsonValue;
}

@Injectable()
export class DigitalTwinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async createDefinition(input: CreateDigitalTwinDefinitionInput) {
    this.boundary.assertTwinOwnerIsNotSelf(input.institutionalOwnerId, input.representedSubjectId);
    this.boundary.assertCaseTwinPreventsProfileExpansion(
      input.representedSubjectType,
      input.preventsPersonalProfileExpansion ?? true,
    );

    const definition = await this.prisma.digitalTwinDefinition.create({
      data: {
        twinCode: input.twinCode,
        representedSubjectType: input.representedSubjectType,
        representedSubjectId: input.representedSubjectId,
        representedSubjectReference: input.representedSubjectReference,
        institutionalOwnerId: input.institutionalOwnerId,
        institutionalOwnerOfficeholderId: input.institutionalOwnerOfficeholderId,
        purpose: input.purpose,
        scope: input.scope,
        permittedUses: input.permittedUses ?? [],
        prohibitedUses: input.prohibitedUses ?? [],
        sourceRequirements: input.sourceRequirements,
        privacyClassification:
          input.privacyClassification ?? DigitalTwinPrivacyClassification.INTERNAL,
        preventsPersonalProfileExpansion: input.preventsPersonalProfileExpansion ?? true,
        isAuthoritativeRecord: false,
        status: DigitalTwinDefinitionStatus.DRAFT,
      },
    });

    this.boundary.assertTwinIsNotAuthoritativeRecord(definition);
    return definition;
  }

  async createVersion(input: CreateDigitalTwinVersionInput) {
    const definition = await this.prisma.digitalTwinDefinition.findUnique({
      where: { id: input.definitionId },
    });

    if (!definition) {
      throw new NotFoundException(`DigitalTwinDefinition ${input.definitionId} not found`);
    }

    const latest = await this.prisma.digitalTwinVersion.findFirst({
      where: { definitionId: input.definitionId },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    if (input.setCurrent) {
      await this.prisma.digitalTwinVersion.updateMany({
        where: { definitionId: input.definitionId, isCurrent: true },
        data: { isCurrent: false, effectiveTo: new Date() },
      });
    }

    return this.prisma.digitalTwinVersion.create({
      data: {
        definitionId: input.definitionId,
        versionNumber,
        versionLabel: input.versionLabel,
        configuration: input.configuration ?? {},
        modelVersionReference: input.modelVersionReference,
        isCurrent: input.setCurrent ?? versionNumber === 1,
      },
    });
  }

  async addSource(input: CreateDigitalTwinSourceInput) {
    await this.ensureVersionExists(input.twinVersionId);

    return this.prisma.digitalTwinSource.create({
      data: {
        twinVersionId: input.twinVersionId,
        sourceName: input.sourceName,
        sourceStatus: input.sourceStatus,
        integrationReference: input.integrationReference,
        evidenceReference: input.evidenceReference,
        freshnessAsOf: input.freshnessAsOf,
        ownerIdentityId: input.ownerIdentityId,
        ownerOfficeholderId: input.ownerOfficeholderId,
        lastUpdatedAt: new Date(),
        limitations: input.limitations,
        isDisclosed: input.isDisclosed ?? false,
      },
    });
  }

  async createRelationship(input: CreateDigitalTwinRelationshipInput) {
    if (input.fromDefinitionId === input.toDefinitionId) {
      throw new BadRequestException('Twin cannot relate to itself as owner');
    }

    this.boundary.assertRelationshipIsModeledOnly(true);

    return this.prisma.digitalTwinRelationship.create({
      data: {
        fromDefinitionId: input.fromDefinitionId,
        toDefinitionId: input.toDefinitionId,
        relationshipType: input.relationshipType,
        isModeledOnly: true,
        notes: input.notes,
      },
    });
  }

  async recordMode(input: RecordDigitalTwinModeInput) {
    await this.ensureVersionExists(input.twinVersionId);
    this.boundary.assertModeIsNotOperationalControl(input.mode, false);

    return this.prisma.digitalTwinModeRecord.create({
      data: {
        twinVersionId: input.twinVersionId,
        mode: input.mode,
        recordedByIdentityId: input.recordedByIdentityId,
        rationale: input.rationale,
        isOperationalControl: false,
      },
    });
  }

  async createSnapshot(input: CreateDigitalTwinSnapshotInput) {
    await this.ensureVersionExists(input.twinVersionId);

    const payloadString = JSON.stringify(input.snapshotPayload);
    const snapshotHash = createHash('sha256').update(payloadString).digest('hex');

    const snapshot = await this.prisma.digitalTwinSnapshot.create({
      data: {
        twinVersionId: input.twinVersionId,
        snapshotPayload: input.snapshotPayload,
        snapshotHash,
        isImmutable: true,
      },
    });

    this.boundary.assertSnapshotImmutable(snapshot.isImmutable);
    return snapshot;
  }

  async findDefinitionById(id: string) {
    const definition = await this.prisma.digitalTwinDefinition.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        outgoingRelationships: true,
        incomingRelationships: true,
      },
    });

    if (!definition) {
      throw new NotFoundException(`DigitalTwinDefinition ${id} not found`);
    }

    this.boundary.assertTwinIsNotAuthoritativeRecord(definition);
    return definition;
  }

  async findVersionById(id: string) {
    const version = await this.prisma.digitalTwinVersion.findUnique({
      where: { id },
      include: {
        definition: true,
        sources: true,
        snapshots: { orderBy: { snapshotAt: 'desc' } },
        modeRecords: { orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!version) {
      throw new NotFoundException(`DigitalTwinVersion ${id} not found`);
    }

    this.boundary.assertTwinIsNotAuthoritativeRecord(version.definition);
    return version;
  }

  async markTwinIntegrity(
    definitionId: string,
    flags: Partial<{
      isStale: boolean;
      isIncomplete: boolean;
      isInconsistent: boolean;
      isCompromised: boolean;
      outsideApprovedUse: boolean;
      staleAsOf: Date;
    }>,
  ) {
    return this.prisma.digitalTwinDefinition.update({
      where: { id: definitionId },
      data: flags,
    });
  }

  private async ensureVersionExists(twinVersionId: string) {
    const version = await this.prisma.digitalTwinVersion.findUnique({
      where: { id: twinVersionId },
    });

    if (!version) {
      throw new NotFoundException(`DigitalTwinVersion ${twinVersionId} not found`);
    }

    return version;
  }
}
