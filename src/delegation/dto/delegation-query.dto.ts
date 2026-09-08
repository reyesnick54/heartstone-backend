import { ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class DelegationQueryDto {
  @ApiPropertyOptional({ enum: DelegationStatus })
  @IsEnum(DelegationStatus)
  @IsOptional()
  status?: DelegationStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  delegatorInstitutionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  delegatorOfficeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  delegatorOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recipientInstitutionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recipientOfficeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recipientOfficeholderId?: string;

  @ApiPropertyOptional({
    description: 'Return delegations effective on this date (inclusive)',
    example: '2026-06-15T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  effectiveOn?: Date;
}
