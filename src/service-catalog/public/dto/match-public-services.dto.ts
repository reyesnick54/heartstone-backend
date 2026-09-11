import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class MatchPublicServicesDto {
  @ApiProperty({ description: 'Citizen-facing need description or keywords' })
  @IsString()
  query!: string;

  @ApiPropertyOptional({ enum: ApplicantCategory })
  @IsOptional()
  @IsEnum(ApplicantCategory)
  applicantCategory?: ApplicantCategory;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional activity hints supplied by the citizen',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityHints?: string[];
}
