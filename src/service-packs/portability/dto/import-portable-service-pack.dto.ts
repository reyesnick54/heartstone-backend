import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class ImportPortableServicePackDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  targetServicePackId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetInstitutionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetJurisdictionId!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  package!: Record<string, unknown>;
}
