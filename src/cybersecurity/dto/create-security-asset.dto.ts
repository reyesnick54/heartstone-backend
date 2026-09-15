import { SecurityEnvironment, SecurityFindingSeverity } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSecurityAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assetCode?: string;

  @IsString()
  @MaxLength(256)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  assetType!: string;

  @IsEnum(SecurityEnvironment)
  environment!: SecurityEnvironment;

  @IsUUID()
  ownerIdentityId!: string;

  @IsOptional()
  @IsEnum(SecurityFindingSeverity)
  criticality?: SecurityFindingSeverity;

  @IsOptional()
  @IsBoolean()
  isProductionConsequential?: boolean;
}
