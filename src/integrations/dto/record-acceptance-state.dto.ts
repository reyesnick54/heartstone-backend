import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationAcceptanceState } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordAcceptanceStateDto {
  @ApiProperty({ enum: IntegrationAcceptanceState })
  @IsEnum(IntegrationAcceptanceState)
  acceptanceState!: IntegrationAcceptanceState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  achievedByIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  achievedByOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
