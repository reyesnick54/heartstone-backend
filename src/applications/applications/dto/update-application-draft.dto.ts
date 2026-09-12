import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateApplicationDraftDto {
  @ApiProperty({ description: 'Draft form answers keyed by field key' })
  @IsObject()
  answers!: Record<string, unknown>;

  @ApiProperty()
  @IsUUID()
  formVersionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  configurationFingerprint?: string;
}
