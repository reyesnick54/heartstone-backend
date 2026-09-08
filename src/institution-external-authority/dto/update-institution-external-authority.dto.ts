import { ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionExternalAuthorityRelationshipType, RecordStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInstitutionExternalAuthorityDto {
  @ApiPropertyOptional({
    enum: InstitutionExternalAuthorityRelationshipType,
  })
  @IsOptional()
  @IsEnum(InstitutionExternalAuthorityRelationshipType)
  relationshipType?: InstitutionExternalAuthorityRelationshipType;

  @ApiPropertyOptional({ example: 'Routine policy coordination channel' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
