import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BuildProvenanceStatus,
  Prisma,
  ReleaseAttestationStatus,
  SecurityFindingSeverity,
  VendorSecurityAssessmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CybersecurityBoundaryService } from '../common/cybersecurity-boundary.service';
import { generateCybersecurityReference } from '../common/reference-number.util';
import {
  BUILD_PROVENANCE_CODE_PREFIX,
  DEPENDENCY_VULNERABILITY_NUMBER_PREFIX,
  RELEASE_ATTESTATION_NUMBER_PREFIX,
  SBOM_CODE_PREFIX,
  SOFTWARE_COMPONENT_CODE_PREFIX,
  VENDOR_ASSESSMENT_NUMBER_PREFIX,
} from '../cybersecurity.constants';
import {
  ApproveReleaseAttestationDto,
  CreateBuildProvenanceRecordDto,
  CreateDependencyVulnerabilityRecordDto,
  CreateReleaseArtifactAttestationDto,
  CreateSoftwareBillOfMaterialsRecordDto,
  CreateSoftwareComponentRecordDto,
  CreateVendorSecurityAssessmentDto,
  RecordDependencyChangeDto,
} from '../dto/supply-chain.dto';

@Injectable()
export class SupplyChainService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CybersecurityBoundaryService,
  ) {}

  async registerComponent(dto: CreateSoftwareComponentRecordDto) {
    return this.prisma.softwareComponentRecord.create({
      data: {
        componentCode:
          dto.componentCode ?? generateCybersecurityReference(SOFTWARE_COMPONENT_CODE_PREFIX),
        name: dto.name,
        version: dto.version,
        componentType: dto.componentType,
        purl: dto.purl,
        license: dto.license,
        ownerIdentityId: dto.ownerIdentityId,
      },
    });
  }

  async generateSbom(dto: CreateSoftwareBillOfMaterialsRecordDto) {
    return this.prisma.softwareBillOfMaterialsRecord.create({
      data: {
        sbomCode: dto.sbomCode ?? generateCybersecurityReference(SBOM_CODE_PREFIX),
        releaseReference: dto.releaseReference,
        format: dto.format ?? 'CycloneDX',
        artifactDigest: dto.artifactDigest,
        componentInventory: dto.componentInventory as Prisma.InputJsonValue,
        ownerIdentityId: dto.ownerIdentityId,
      },
    });
  }

  async recordDependencyVulnerability(dto: CreateDependencyVulnerabilityRecordDto) {
    const isProductionBlocking = dto.severity === SecurityFindingSeverity.CRITICAL;

    return this.prisma.dependencyVulnerabilityRecord.create({
      data: {
        recordNumber:
          dto.recordNumber ??
          generateCybersecurityReference(DEPENDENCY_VULNERABILITY_NUMBER_PREFIX),
        componentId: dto.componentId,
        packageName: dto.packageName,
        packageVersion: dto.packageVersion,
        cveId: dto.cveId,
        severity: dto.severity,
        isProductionBlocking,
        dispositionReference: dto.dispositionReference,
        ownerIdentityId: dto.ownerIdentityId,
      },
    });
  }

  async recordBuildProvenance(dto: CreateBuildProvenanceRecordDto) {
    return this.prisma.buildProvenanceRecord.create({
      data: {
        provenanceCode:
          dto.provenanceCode ?? generateCybersecurityReference(BUILD_PROVENANCE_CODE_PREFIX),
        sourceCommitSha: dto.sourceCommitSha,
        buildId: dto.buildId,
        buildSystem: dto.buildSystem,
        testRunReference: dto.testRunReference,
        artifactDigest: dto.artifactDigest,
        status: dto.status ?? BuildProvenanceStatus.RECORDED,
        verificationMethod: dto.verificationMethod,
        ownerIdentityId: dto.ownerIdentityId,
      },
    });
  }

  async verifyBuildProvenance(id: string) {
    const record = await this.prisma.buildProvenanceRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Build provenance record "${id}" was not found`);
    }

    if (record.status === BuildProvenanceStatus.UNVERIFIABLE) {
      this.boundary.assertReleaseArtifactVerifiable({
        isSigned: true,
        status: ReleaseAttestationStatus.PENDING,
        buildProvenanceStatus: BuildProvenanceStatus.UNVERIFIABLE,
        artifactDigest: record.artifactDigest,
        sourceCommitSha: record.sourceCommitSha,
      });
    }

    return this.prisma.buildProvenanceRecord.update({
      where: { id },
      data: { status: BuildProvenanceStatus.VERIFIED },
    });
  }

  async createReleaseAttestation(
    dto: CreateReleaseArtifactAttestationDto,
    clientPayload: Record<string, unknown>,
  ) {
    this.boundary.rejectClientProtectedReleaseAttestationFields(clientPayload);
    const provenance = await this.prisma.buildProvenanceRecord.findUnique({
      where: { id: dto.buildProvenanceId },
    });
    if (!provenance) {
      throw new NotFoundException(
        `Build provenance record "${dto.buildProvenanceId}" was not found`,
      );
    }

    this.boundary.assertReleaseArtifactVerifiable({
      isSigned: dto.isSigned ?? false,
      status: ReleaseAttestationStatus.PENDING,
      buildProvenanceStatus: provenance.status,
      artifactDigest: dto.artifactDigest,
      sourceCommitSha: dto.sourceCommitSha,
    });

    return this.prisma.releaseArtifactAttestation.create({
      data: {
        attestationNumber:
          dto.attestationNumber ??
          generateCybersecurityReference(RELEASE_ATTESTATION_NUMBER_PREFIX),
        releaseReference: dto.releaseReference,
        sourceCommitSha: dto.sourceCommitSha,
        buildProvenanceId: dto.buildProvenanceId,
        sbomRecordId: dto.sbomRecordId,
        artifactDigest: dto.artifactDigest,
        signatureReference: dto.signatureReference,
        isSigned: dto.isSigned ?? false,
        status: ReleaseAttestationStatus.PENDING,
      },
    });
  }

  async approveReleaseAttestation(id: string, dto: ApproveReleaseAttestationDto) {
    const attestation = await this.prisma.releaseArtifactAttestation.findUnique({
      where: { id },
      include: { buildProvenance: true },
    });
    if (!attestation) {
      throw new NotFoundException(`Release artifact attestation "${id}" was not found`);
    }

    this.boundary.assertReleaseArtifactVerifiable({
      isSigned: attestation.isSigned,
      status: attestation.status,
      buildProvenanceStatus: attestation.buildProvenance.status,
      artifactDigest: attestation.artifactDigest,
      sourceCommitSha: attestation.sourceCommitSha,
    });

    return this.prisma.releaseArtifactAttestation.update({
      where: { id },
      data: {
        status: ReleaseAttestationStatus.ATTESTED,
        approverIdentityId: dto.approverIdentityId,
        approvedAt: new Date(),
      },
    });
  }

  async assessVendor(dto: CreateVendorSecurityAssessmentDto) {
    return this.prisma.vendorSecurityAssessment.create({
      data: {
        assessmentNumber:
          dto.assessmentNumber ?? generateCybersecurityReference(VENDOR_ASSESSMENT_NUMBER_PREFIX),
        vendorName: dto.vendorName,
        vendorReference: dto.vendorReference,
        assessorIdentityId: dto.assessorIdentityId,
        status: dto.status ?? VendorSecurityAssessmentStatus.PENDING,
        findingsSummary: dto.findingsSummary,
        expiresAt: dto.expiresAt,
      },
    });
  }

  async recordDependencyChange(dto: RecordDependencyChangeDto) {
    this.boundary.assertDependencyChangeRequiresControlledRelease(
      dto.previousVersion,
      dto.nextVersion,
      Boolean(dto.controlledReleaseReference?.trim()),
    );

    const component = await this.prisma.softwareComponentRecord.findUnique({
      where: { id: dto.componentId },
    });
    if (!component) {
      throw new NotFoundException(`Software component "${dto.componentId}" was not found`);
    }

    return this.prisma.softwareComponentRecord.update({
      where: { id: dto.componentId },
      data: {
        version: dto.nextVersion,
      },
    });
  }

  async countUnsignedReleaseArtifacts() {
    return this.prisma.releaseArtifactAttestation.count({
      where: {
        OR: [{ isSigned: false }, { status: { not: ReleaseAttestationStatus.ATTESTED } }],
      },
    });
  }

  async countUnverifiableProvenanceRecords() {
    return this.prisma.buildProvenanceRecord.count({
      where: { status: BuildProvenanceStatus.UNVERIFIABLE },
    });
  }

  dispositionCriticalVulnerability(id: string, dispositionReference: string) {
    if (!dispositionReference.trim()) {
      throw new BadRequestException('Critical vulnerability disposition requires formal reference');
    }

    return this.prisma.dependencyVulnerabilityRecord.update({
      where: { id },
      data: {
        dispositionReference,
        isProductionBlocking: false,
      },
    });
  }
}
