import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseMilestoneStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCaseMilestoneDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: CaseMilestoneStatus })
  @IsOptional()
  @IsEnum(CaseMilestoneStatus)
  status?: CaseMilestoneStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsiblePartyRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceSlaReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dependencyReference?: string;
}
