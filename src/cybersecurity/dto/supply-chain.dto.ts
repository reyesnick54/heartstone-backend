import {
  BuildProvenanceStatus,
  SecurityFindingSeverity,
  SoftwareComponentType,
  VendorSecurityAssessmentStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSoftwareComponentRecordDto {
  @IsOptional()
  @IsString()
  componentCode?: string;

  @IsString()
  name!: string;

  @IsString()
  version!: string;

  @IsEnum(SoftwareComponentType)
  componentType!: SoftwareComponentType;

  @IsOptional()
  @IsString()
  purl?: string;

  @IsOptional()
  @IsString()
  license?: string;

  @IsUUID()
  ownerIdentityId!: string;
}

export class CreateSoftwareBillOfMaterialsRecordDto {
  @IsOptional()
  @IsString()
  sbomCode?: string;

  @IsString()
  releaseReference!: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsString()
  artifactDigest!: string;

  @IsObject()
  componentInventory!: Record<string, unknown>;

  @IsUUID()
  ownerIdentityId!: string;
}

export class CreateDependencyVulnerabilityRecordDto {
  @IsOptional()
  @IsString()
  recordNumber?: string;

  @IsOptional()
  @IsUUID()
  componentId?: string;

  @IsString()
  packageName!: string;

  @IsString()
  packageVersion!: string;

  @IsOptional()
  @IsString()
  cveId?: string;

  @IsEnum(SecurityFindingSeverity)
  severity!: SecurityFindingSeverity;

  @IsOptional()
  @IsString()
  dispositionReference?: string;

  @IsUUID()
  ownerIdentityId!: string;
}

export class CreateBuildProvenanceRecordDto {
  @IsOptional()
  @IsString()
  provenanceCode?: string;

  @IsString()
  sourceCommitSha!: string;

  @IsString()
  buildId!: string;

  @IsString()
  buildSystem!: string;

  @IsOptional()
  @IsString()
  testRunReference?: string;

  @IsString()
  artifactDigest!: string;

  @IsOptional()
  @IsEnum(BuildProvenanceStatus)
  status?: BuildProvenanceStatus;

  @IsOptional()
  @IsString()
  verificationMethod?: string;

  @IsUUID()
  ownerIdentityId!: string;
}

export class CreateReleaseArtifactAttestationDto {
  @IsOptional()
  @IsString()
  attestationNumber?: string;

  @IsString()
  releaseReference!: string;

  @IsString()
  sourceCommitSha!: string;

  @IsUUID()
  buildProvenanceId!: string;

  @IsOptional()
  @IsUUID()
  sbomRecordId?: string;

  @IsString()
  artifactDigest!: string;

  @IsOptional()
  @IsString()
  signatureReference?: string;

  @IsOptional()
  @IsBoolean()
  isSigned?: boolean;
}

export class ApproveReleaseAttestationDto {
  @IsUUID()
  approverIdentityId!: string;
}

export class CreateVendorSecurityAssessmentDto {
  @IsOptional()
  @IsString()
  assessmentNumber?: string;

  @IsString()
  vendorName!: string;

  @IsString()
  vendorReference!: string;

  @IsUUID()
  assessorIdentityId!: string;

  @IsOptional()
  @IsEnum(VendorSecurityAssessmentStatus)
  status?: VendorSecurityAssessmentStatus;

  @IsOptional()
  @IsString()
  findingsSummary?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

export class RecordDependencyChangeDto {
  @IsUUID()
  componentId!: string;

  @IsString()
  previousVersion!: string;

  @IsString()
  nextVersion!: string;

  @IsOptional()
  @IsString()
  controlledReleaseReference?: string;
}
