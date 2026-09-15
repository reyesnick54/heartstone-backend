import { SecurityControlDomain, SecurityFindingSeverity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSecurityFindingDto {
  @IsOptional()
  @IsString()
  findingNumber?: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(SecurityFindingSeverity)
  severity!: SecurityFindingSeverity;

  @IsEnum(SecurityControlDomain)
  domain!: SecurityControlDomain;

  @IsOptional()
  @IsUUID()
  implementationId?: string;

  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @IsUUID()
  ownerIdentityId!: string;

  @IsOptional()
  @IsBoolean()
  riskAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  identifiedAt?: Date;
}
