import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilitySubjectType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCapabilityDefinitionDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CapabilitySubjectType })
  @IsEnum(CapabilitySubjectType)
  subjectType!: CapabilitySubjectType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subjectReferenceId?: string;
}
