import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDecisionTypeDto {
  @ApiProperty({ example: 'ABSEZ-LICENSE-APPROVAL' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  code!: string;

  @ApiProperty({ example: 'ABSEZ License Approval Decision' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsibleInstitutionId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleDepartmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  governingSourceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  governmentServiceId?: string;
}
