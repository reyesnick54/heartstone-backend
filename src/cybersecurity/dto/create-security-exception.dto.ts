import { SecurityFindingSeverity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSecurityExceptionDto {
  @IsOptional()
  @IsString()
  exceptionNumber?: string;

  @IsUUID()
  controlDefinitionId!: string;

  @IsOptional()
  @IsUUID()
  implementationId?: string;

  @IsString()
  businessJustification!: string;

  @IsString()
  scopeDescription!: string;

  @IsString()
  compensatingControls!: string;

  @IsString()
  riskDescription!: string;

  @IsUUID()
  ownerIdentityId!: string;

  @IsEnum(SecurityFindingSeverity)
  severity!: SecurityFindingSeverity;

  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;

  @Type(() => Date)
  @IsDate()
  reviewDate!: Date;
}
