import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServicePackReviewFindingCategory,
  ServicePackReviewFindingCode,
  ServicePackReviewFindingSeverity,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddReviewFindingDto {
  @ApiProperty({ enum: ServicePackReviewFindingCode })
  @IsEnum(ServicePackReviewFindingCode)
  findingCode!: ServicePackReviewFindingCode;

  @ApiProperty({ enum: ServicePackReviewFindingSeverity })
  @IsEnum(ServicePackReviewFindingSeverity)
  severity!: ServicePackReviewFindingSeverity;

  @ApiProperty({ enum: ServicePackReviewFindingCategory })
  @IsEnum(ServicePackReviewFindingCategory)
  category!: ServicePackReviewFindingCategory;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  affectedComponent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resolverIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidenceReference?: string;
}
