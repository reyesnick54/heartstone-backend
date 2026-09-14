import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationApprovalStatus, IntegrationApprovalType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordIntegrationApprovalDto {
  @ApiProperty({ enum: IntegrationApprovalType })
  @IsEnum(IntegrationApprovalType)
  approvalType!: IntegrationApprovalType;

  @ApiProperty({ enum: IntegrationApprovalStatus })
  @IsEnum(IntegrationApprovalStatus)
  status!: IntegrationApprovalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approvedByIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approvedByOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
