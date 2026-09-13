import { Injectable, NotFoundException } from '@nestjs/common';
import { LegalHoldTargetType, PreservationCollectionPurpose, PreservationCollectionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashRecordsPayload } from '../common/records-hash.util';

export interface CreatePreservationCollectionInput {
  collectionReference: string;
  title: string;
  purpose: PreservationCollectionPurpose;
  frozenByIdentityId: string;
  items: {
    targetType: LegalHoldTargetType;
    targetReference: string;
    versionReference: string;
    integrityHash: string;
  }[];
}

@Injectable()
export class PreservationCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePreservationCollectionInput) {
    const integrityManifest = input.items.map((item) => ({
      targetType: item.targetType,
      targetReference: item.targetReference,
      versionReference: item.versionReference,
      integrityHash: item.integrityHash,
    }));
    const manifestHash = hashRecordsPayload(integrityManifest);

    return this.prisma.preservationCollection.create({
      data: {
        collectionReference: input.collectionReference,
        title: input.title,
        purpose: input.purpose,
        frozenByIdentityId: input.frozenByIdentityId,
        integrityManifest,
        manifestHash,
        status: PreservationCollectionStatus.ACTIVE,
        items: {
          create: input.items.map((item) => ({
            targetType: item.targetType,
            targetReference: item.targetReference,
            versionReference: item.versionReference,
            integrityHash: item.integrityHash,
          })),
        },
      },
      include: { items: true },
    });
  }

  async getByReference(collectionReference: string) {
    const collection = await this.prisma.preservationCollection.findUnique({
      where: { collectionReference },
      include: { items: true },
    });
    if (!collection) {
      throw new NotFoundException(`PreservationCollection "${collectionReference}" was not found`);
    }
    return collection;
  }

  async verifyIntegrity(collectionReference: string): Promise<boolean> {
    const collection = await this.getByReference(collectionReference);
    const recalculated = hashRecordsPayload(collection.integrityManifest);
    return recalculated === collection.manifestHash;
  }

  async blocksDisposition(targetReference: string): Promise<boolean> {
    const active = await this.prisma.preservationCollection.count({
      where: {
        status: PreservationCollectionStatus.ACTIVE,
        purpose: { in: ['APPEAL', 'INVESTIGATION'] },
        items: { some: { targetReference } },
      },
    });
    return active > 0;
  }
}
