import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class AddDecisionFindingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  findingCode?: string;

  @ApiProperty()
  @IsString()
  findingText!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceCriterionReference?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  evidenceReferences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  professionalReviewReferences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  governmentInputReferences?: string[];
}
