import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseLegalStatus, CaseStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateCaseStatusDto {
  @ApiProperty({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  caseStatus!: CaseStatus;

  @ApiPropertyOptional({ enum: CaseLegalStatus })
  @IsOptional()
  @IsEnum(CaseLegalStatus)
  legalStatus?: CaseLegalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  officeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  correlationId?: string;
}
