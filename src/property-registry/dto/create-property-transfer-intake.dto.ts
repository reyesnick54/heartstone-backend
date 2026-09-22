import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreatePropertyTransferIntakeDto {
  @ApiProperty()
  @IsUUID()
  landParcelId!: string;

  @ApiProperty()
  @IsUUID()
  propertyRecordId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  titleRecordId?: string;

  @ApiProperty()
  @IsUUID()
  jurisdictionId!: string;

  @ApiProperty()
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governmentServiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governingServicePackVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;
}
