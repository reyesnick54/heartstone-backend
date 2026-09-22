import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePackReviewType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateServicePackReviewDto {
  @ApiProperty({ description: 'Target service pack version under governance review' })
  @IsUUID()
  servicePackVersionId!: string;

  @ApiPropertyOptional({ enum: ServicePackReviewType })
  @IsOptional()
  @IsEnum(ServicePackReviewType)
  reviewType?: ServicePackReviewType;
}
