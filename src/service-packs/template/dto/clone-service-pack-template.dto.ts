import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CloneServicePackTemplateDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetInstitutionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetJurisdictionId!: string;

  @ApiProperty({ example: 'immigration-services-pack-bb-template' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  targetPackCode!: string;

  @ApiProperty({ example: 'Immigration Services Pack (Barbados Template)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  targetPackName!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleOwnerIdentityId?: string;
}
