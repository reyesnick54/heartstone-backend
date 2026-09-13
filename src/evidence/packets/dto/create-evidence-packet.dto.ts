import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidencePacketPurpose } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateEvidencePacketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  masterAdministrativeFileId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiProperty({ enum: EvidencePacketPurpose })
  @IsEnum(EvidencePacketPurpose)
  purpose!: EvidencePacketPurpose;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  questionOrIssue!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsibleDepartmentId!: string;

  @ApiPropertyOptional({
    description: 'Stable external project reference when purpose is PROJECT_READINESS',
  })
  @IsOptional()
  @IsString()
  externalProjectReference?: string;
}
