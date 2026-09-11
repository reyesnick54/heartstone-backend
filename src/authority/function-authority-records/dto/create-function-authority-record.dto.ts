import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorityClassification, ControlledFunctionClass } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateFunctionAuthorityRecordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AuthorityClassification })
  @IsEnum(AuthorityClassification)
  classification!: AuthorityClassification;

  @ApiProperty({ enum: ControlledFunctionClass })
  @IsEnum(ControlledFunctionClass)
  functionClass!: ControlledFunctionClass;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresDelegation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresAppointment?: boolean;
}
