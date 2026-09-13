import { ApiProperty } from '@nestjs/swagger';
import { DecisionConditionType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class AddDecisionConditionDto {
  @ApiProperty({ enum: DecisionConditionType })
  @IsEnum(DecisionConditionType)
  conditionType!: DecisionConditionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceAuthority?: string;

  @ApiProperty()
  @IsString()
  responsibleParty!: string;

  @ApiProperty()
  @IsString()
  requiredActionOrRestraint!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requiredEvidenceDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monitoringMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  verifierOfficeAuthority?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  consequenceOfNoncompliance?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
