import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TechnicalAccessScopeType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTechnicalRoleAssignmentDto {
  @ApiProperty()
  @IsUUID()
  identityId!: string;

  @ApiProperty({ description: 'Bootstrap role code (e.g. identity-platform-administrator)' })
  @IsString()
  roleCode!: string;

  @ApiPropertyOptional({
    enum: TechnicalAccessScopeType,
    default: TechnicalAccessScopeType.PLATFORM,
  })
  @IsOptional()
  @IsEnum(TechnicalAccessScopeType)
  scopeType?: TechnicalAccessScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governmentBodyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;
}
