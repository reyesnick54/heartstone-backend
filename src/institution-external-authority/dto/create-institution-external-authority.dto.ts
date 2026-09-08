import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionExternalAuthorityRelationshipType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInstitutionExternalAuthorityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  institutionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  externalAuthorityId!: string;

  @ApiProperty({
    enum: InstitutionExternalAuthorityRelationshipType,
    example: InstitutionExternalAuthorityRelationshipType.COORDINATION,
  })
  @IsEnum(InstitutionExternalAuthorityRelationshipType)
  relationshipType!: InstitutionExternalAuthorityRelationshipType;

  @ApiPropertyOptional({ example: 'Routine policy coordination channel' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
