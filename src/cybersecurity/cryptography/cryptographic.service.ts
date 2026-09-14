import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CryptographicMigrationStatus, PostQuantumMigrationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CybersecurityBoundaryService } from '../common/cybersecurity-boundary.service';
import { generateCybersecurityReference } from '../common/reference-number.util';
import {
  CRYPTOGRAPHIC_AGILITY_ASSESSMENT_NUMBER_PREFIX,
  CRYPTOGRAPHIC_ASSET_CODE_PREFIX,
  CRYPTOGRAPHIC_POLICY_CODE_PREFIX,
  POST_QUANTUM_ITEM_CODE_PREFIX,
} from '../cybersecurity.constants';
import {
  CreateCertificateReferenceDto,
  CreateCryptographicAgilityAssessmentDto,
  CreateCryptographicAssetDto,
  CreateCryptographicKeyReferenceDto,
  CreateCryptographicPolicyDto,
  CreatePostQuantumMigrationItemDto,
  RotateCryptographicAssetDto,
} from '../dto/cryptography.dto';

@Injectable()
export class CryptographicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CybersecurityBoundaryService,
  ) {}

  async registerKeyReference(dto: CreateCryptographicKeyReferenceDto) {
    this.boundary.assertSecretManagerReferenceOnly(dto.secretManagerReference);

    return this.prisma.cryptographicKeyReference.create({
      data: {
        referenceCode: dto.referenceCode ?? generateCybersecurityReference('CKEY'),
        secretManagerReference: dto.secretManagerReference,
        algorithm: dto.algorithm,
        keyPurpose: dto.keyPurpose,
        effectiveFrom: dto.effectiveFrom,
        expiresAt: dto.expiresAt,
        rotationScheduleDays: dto.rotationScheduleDays,
      },
    });
  }

  async registerCertificateReference(dto: CreateCertificateReferenceDto) {
    this.boundary.assertSecretManagerReferenceOnly(dto.secretManagerReference);
    this.boundary.assertCertificateNotExpired(dto.expiresAt);

    return this.prisma.certificateReference.create({
      data: {
        referenceCode: dto.referenceCode ?? generateCybersecurityReference('CCRT'),
        secretManagerReference: dto.secretManagerReference,
        subject: dto.subject,
        issuer: dto.issuer,
        serialNumber: dto.serialNumber,
        effectiveFrom: dto.effectiveFrom,
        expiresAt: dto.expiresAt,
      },
    });
  }

  async registerAsset(dto: CreateCryptographicAssetDto, clientPayload: Record<string, unknown>) {
    this.boundary.rejectClientProtectedCryptographicAssetFields(clientPayload);
    this.boundary.assertPostQuantumClaimsValid({
      claimsPostQuantumSecurity: dto.claimsPostQuantumSecurity ?? false,
      postQuantumValidated: false,
      historicalVerificationPreserved: dto.historicalVerificationPreserved ?? true,
      algorithmVersion: dto.algorithmVersion,
    });

    if (dto.keyReferenceId) {
      await this.ensureKeyReferenceExists(dto.keyReferenceId);
    }

    return this.prisma.cryptographicAsset.create({
      data: {
        assetCode: dto.assetCode ?? generateCybersecurityReference(CRYPTOGRAPHIC_ASSET_CODE_PREFIX),
        name: dto.name,
        algorithm: dto.algorithm,
        algorithmVersion: dto.algorithmVersion,
        purpose: dto.purpose,
        dataOrSystemReference: dto.dataOrSystemReference,
        keyReferenceId: dto.keyReferenceId,
        certificateReferenceId: dto.certificateReferenceId,
        trustAnchorReferenceId: dto.trustAnchorReferenceId,
        ownerIdentityId: dto.ownerIdentityId,
        effectiveFrom: dto.effectiveFrom,
        expiresAt: dto.expiresAt,
        rotationScheduleDays: dto.rotationScheduleDays,
        cryptographicStrengthBits: dto.cryptographicStrengthBits,
        migrationStatus: dto.migrationStatus ?? CryptographicMigrationStatus.CURRENT,
        claimsPostQuantumSecurity: dto.claimsPostQuantumSecurity ?? false,
        postQuantumValidated: false,
        historicalVerificationPreserved: dto.historicalVerificationPreserved ?? true,
      },
    });
  }

  async createPolicy(dto: CreateCryptographicPolicyDto) {
    return this.prisma.cryptographicPolicy.create({
      data: {
        policyCode:
          dto.policyCode ?? generateCybersecurityReference(CRYPTOGRAPHIC_POLICY_CODE_PREFIX),
        title: dto.title,
        description: dto.description,
        minimumKeyStrengthBits: dto.minimumKeyStrengthBits,
        approvedAlgorithms: dto.approvedAlgorithms,
        deprecatedAlgorithms: dto.deprecatedAlgorithms ?? [],
        ownerIdentityId: dto.ownerIdentityId,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
      },
    });
  }

  async assessAgility(dto: CreateCryptographicAgilityAssessmentDto) {
    await this.ensurePolicyExists(dto.policyId);

    return this.prisma.cryptographicAgilityAssessment.create({
      data: {
        assessmentNumber:
          dto.assessmentNumber ??
          generateCybersecurityReference(CRYPTOGRAPHIC_AGILITY_ASSESSMENT_NUMBER_PREFIX),
        policyId: dto.policyId,
        assessorIdentityId: dto.assessorIdentityId,
        canVersionAlgorithms: dto.canVersionAlgorithms ?? false,
        canRotateKeys: dto.canRotateKeys ?? false,
        canReplaceCertificates: dto.canReplaceCertificates ?? false,
        canChangeTrustAnchors: dto.canChangeTrustAnchors ?? false,
        canIdentifyAffectedRecords: dto.canIdentifyAffectedRecords ?? false,
        preservesHistoricalVerification: dto.preservesHistoricalVerification ?? false,
        canMigrateWithoutDestroyingEvidence: dto.canMigrateWithoutDestroyingEvidence ?? false,
      },
    });
  }

  async registerPostQuantumItem(dto: CreatePostQuantumMigrationItemDto) {
    return this.prisma.postQuantumMigrationItem.create({
      data: {
        itemCode: dto.itemCode ?? generateCybersecurityReference(POST_QUANTUM_ITEM_CODE_PREFIX),
        componentReference: dto.componentReference,
        currentAlgorithm: dto.currentAlgorithm,
        targetAlgorithm: dto.targetAlgorithm,
        status: dto.status ?? PostQuantumMigrationStatus.IDENTIFIED,
        ownerIdentityId: dto.ownerIdentityId,
        riskAcceptanceReference: dto.riskAcceptanceReference,
      },
    });
  }

  async rotateAsset(id: string, dto: RotateCryptographicAssetDto) {
    const asset = await this.prisma.cryptographicAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Cryptographic asset "${id}" was not found`);
    }

    this.boundary.assertAlgorithmVersionPreserved(asset.algorithmVersion, dto.nextAlgorithmVersion);
    this.boundary.assertHistoricalVerificationPreserved(
      dto.historicalVerificationPreserved ?? asset.historicalVerificationPreserved,
    );

    return this.prisma.cryptographicAsset.update({
      where: { id },
      data: {
        algorithm: dto.nextAlgorithm,
        algorithmVersion: dto.nextAlgorithmVersion,
        keyReferenceId: dto.nextKeyReferenceId ?? asset.keyReferenceId,
        migrationStatus: CryptographicMigrationStatus.MIGRATED,
        historicalVerificationPreserved:
          dto.historicalVerificationPreserved ?? asset.historicalVerificationPreserved,
      },
    });
  }

  async markPostQuantumMigrated(id: string, validated: boolean) {
    if (!validated) {
      throw new BadRequestException(
        'Do not claim post-quantum security without validated approved PQ cryptography',
      );
    }

    return this.prisma.postQuantumMigrationItem.update({
      where: { id },
      data: {
        status: PostQuantumMigrationStatus.MIGRATED,
        migratedAt: new Date(),
      },
    });
  }

  private async ensureKeyReferenceExists(id: string): Promise<void> {
    const reference = await this.prisma.cryptographicKeyReference.findUnique({ where: { id } });
    if (!reference) {
      throw new NotFoundException(`Cryptographic key reference "${id}" was not found`);
    }
  }

  private async ensurePolicyExists(id: string): Promise<void> {
    const policy = await this.prisma.cryptographicPolicy.findUnique({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`Cryptographic policy "${id}" was not found`);
    }
  }
}
