import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EvidencePacketVersionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ExternalReviewBoundaryService } from '../common/external-review-boundary.service';
import {
  type ExternalReviewDocumentPin,
  hashExternalReviewPackageManifest,
} from '../common/external-review-manifest.util';
import { ExternalReviewReferralService } from './external-review-referral.service';

export interface CreateExternalReviewPackageInput {
  referralId: string;
  evidencePacketVersionId: string;
}

@Injectable()
export class ExternalReviewPackageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ExternalReviewBoundaryService,
    private readonly referralService: ExternalReviewReferralService,
  ) {}

  async createPinnedPackage(input: CreateExternalReviewPackageInput) {
    const referral = await this.referralService.getReferral(input.referralId);
    const packetVersion = await this.prisma.evidencePacketVersion.findUnique({
      where: { id: input.evidencePacketVersionId },
      include: {
        manifest: true,
        items: {
          where: { isExplicitlyExcluded: false },
          orderBy: { inclusionOrder: 'asc' },
        },
      },
    });

    if (!packetVersion) {
      throw new NotFoundException(
        `EvidencePacketVersion ${input.evidencePacketVersionId} not found`,
      );
    }

    if (packetVersion.status !== EvidencePacketVersionStatus.FROZEN) {
      throw new BadRequestException(
        'External review package must pin a frozen evidence packet version; documents are referenced, not duplicated',
      );
    }

    if (!packetVersion.manifestHash) {
      throw new BadRequestException('Frozen evidence packet version must have a manifest hash');
    }

    const latestPackage = referral.packages[0];
    const packageVersion = latestPackage ? latestPackage.packageVersion + 1 : 1;

    const documentVersionPins: ExternalReviewDocumentPin[] = packetVersion.items.map((item) => ({
      evidenceRecordId: item.evidenceRecordId,
      documentVersionId: item.documentVersionId,
      inclusionOrder: item.inclusionOrder,
    }));

    const canonicalManifest = {
      referralId: referral.id,
      packageVersion,
      evidencePacketVersionId: packetVersion.id,
      evidencePacketManifestHash: packetVersion.manifestHash,
      routeVersion: referral.routeVersion,
      securityClassification: referral.securityClassification,
      documentVersionPins,
      pinnedAt: new Date().toISOString(),
      doesNotDuplicateDocuments: true,
    };

    const manifestHash = hashExternalReviewPackageManifest({
      referralId: referral.id,
      packageVersion,
      evidencePacketVersionId: packetVersion.id,
      evidencePacketManifestHash: packetVersion.manifestHash,
      routeVersion: referral.routeVersion,
      securityClassification: referral.securityClassification,
      documentVersionPins,
    });

    this.boundary.assertSecurityClassificationPreserved({
      packageClassification: referral.securityClassification,
      referralClassification: referral.securityClassification,
    });

    const packageRecord = await this.prisma.externalReviewPackage.create({
      data: {
        referralId: referral.id,
        packageVersion,
        evidencePacketVersionId: packetVersion.id,
        canonicalManifest: canonicalManifest as unknown as Prisma.InputJsonValue,
        manifestHash,
        securityClassification: referral.securityClassification,
        documentVersionPins: documentVersionPins as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.externalReviewReferral.update({
      where: { id: referral.id },
      data: { evidenceManifestReference: manifestHash },
    });

    return packageRecord;
  }

  async assertVersionPinned(referralId: string, evidencePacketVersionId: string): Promise<void> {
    const packageRecord = await this.prisma.externalReviewPackage.findFirst({
      where: { referralId, evidencePacketVersionId },
      orderBy: { packageVersion: 'desc' },
    });

    if (!packageRecord) {
      throw new BadRequestException(
        'Referral package version is not pinned to the requested evidence packet version',
      );
    }
  }
}
