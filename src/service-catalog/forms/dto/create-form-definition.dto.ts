import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormDefinitionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFormDefinitionDto {
  @ApiProperty({ example: 'business-license-application' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  code!: string;

  @ApiProperty({ example: 'Business License Application Form' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Collects applicant details for business license intake' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  purpose?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  governmentServiceVersionId!: string;

  @ApiPropertyOptional({ enum: FormDefinitionStatus })
  @IsOptional()
  @IsEnum(FormDefinitionStatus)
  status?: FormDefinitionStatus;
}
