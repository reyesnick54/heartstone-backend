import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityClassification,
  AuthorityLifecycleState,
  ControlledFunctionClass,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFunctionAuthorityRecordDto {
  @ApiProperty({ example: 'LIC-ELIGIBILITY-SCREEN' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code!: string;

  @ApiProperty({ example: 'License Eligibility Screening' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Screens applicant eligibility for professional licensing.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({
    enum: ControlledFunctionClass,
    example: ControlledFunctionClass.ELIGIBILITY_SCREENING,
  })
  @IsEnum(ControlledFunctionClass)
  functionClass!: ControlledFunctionClass;

  @ApiProperty({
    enum: AuthorityClassification,
    example: AuthorityClassification.ABSEZ_OWNED,
  })
  @IsEnum(AuthorityClassification)
  authorityClassification!: AuthorityClassification;

  @ApiPropertyOptional({
    enum: AuthorityLifecycleState,
    default: AuthorityLifecycleState.RECOGNIZED,
  })
  @IsOptional()
  @IsEnum(AuthorityLifecycleState)
  lifecycleState?: AuthorityLifecycleState;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  revalidationAt?: string;
}
