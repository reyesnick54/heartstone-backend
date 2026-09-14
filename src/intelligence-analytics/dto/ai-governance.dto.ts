import { AIDeploymentType, AIRiskClass } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAiModelDefinitionDto {
  @IsUUID()
  institutionId!: string;

  @IsUUID()
  technicalOwnerId!: string;

  @IsString()
  @MaxLength(100)
  code!: string;

  @IsString()
  @MaxLength(200)
  provider!: string;

  @IsString()
  @MaxLength(200)
  modelFamily!: string;

  @IsEnum(AIDeploymentType)
  deploymentType!: AIDeploymentType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateAiModelVersionDto {
  @IsString()
  @MaxLength(200)
  modelIdentifier!: string;

  @IsOptional()
  @IsString()
  providerVersion?: string;

  @IsOptional()
  @IsString()
  weightsReference?: string;

  @IsOptional()
  @IsString()
  deploymentHash?: string;

  @IsOptional()
  deploymentConfig?: Record<string, unknown>;

  @IsOptional()
  contextTokenLimit?: number;

  @IsOptional()
  capabilities?: string[];

  @IsOptional()
  knownLimitations?: string[];

  @IsString()
  approvedEnvironment!: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveUntil?: string;
}

export class CreateAiUseCaseDto {
  @IsUUID()
  institutionId!: string;

  @IsString()
  @MaxLength(100)
  code!: string;

  @IsString()
  purpose!: string;

  @IsUUID()
  humanReviewerIdentityId!: string;

  @IsEnum(AIRiskClass)
  riskClass!: AIRiskClass;

  @IsString()
  retentionPolicy!: string;

  @IsString()
  escalationPolicy!: string;

  @IsString()
  revalidationPolicy!: string;

  @IsOptional()
  allowsAutonomousFinalDecision?: boolean;
}

export class CreateAiUseCaseVersionDto {
  @IsString()
  versionNumber!: string;

  @IsOptional()
  approvedUserReferences?: string[];

  @IsOptional()
  approvedModelIds?: string[];

  @IsOptional()
  approvedDataReferences?: string[];

  @IsOptional()
  approvedToolReferences?: string[];

  @IsOptional()
  prohibitedUses?: string[];

  @IsOptional()
  @IsUUID()
  aiOutputContractId?: string;

  @IsOptional()
  @IsUUID()
  aiCapabilityDefinitionId?: string;

  @IsOptional()
  @IsUUID()
  approvedModelDefinitionId?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveUntil?: string;
}
