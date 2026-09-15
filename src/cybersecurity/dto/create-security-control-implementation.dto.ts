import { SecurityControlImplementationStatus, SecurityEnvironment } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSecurityControlImplementationDto {
  @IsOptional()
  @IsString()
  implementationCode?: string;

  @IsUUID()
  controlDefinitionId!: string;

  @IsUUID()
  assetId!: string;

  @IsUUID()
  ownerIdentityId!: string;

  @IsString()
  requirementSource!: string;

  @IsString()
  implementationDescription!: string;

  @IsEnum(SecurityEnvironment)
  environment!: SecurityEnvironment;

  @IsOptional()
  @IsString()
  evidenceReference?: string;

  @IsString()
  testMethod!: string;

  @IsOptional()
  @IsEnum(SecurityControlImplementationStatus)
  status?: SecurityControlImplementationStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastTestedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextReviewAt?: Date;
}
