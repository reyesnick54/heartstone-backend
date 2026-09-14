import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateStrategicProjectProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  projectCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  sponsoringInstitutionId!: string;

  @ApiProperty()
  @IsUUID()
  responsibleDepartmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectorCode?: string;

  @ApiProperty()
  @IsObject()
  attributionMetadata!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalFactorNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  announcementDate?: string;
}
