import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePackReviewFindingStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ResolveFindingDto {
  @ApiProperty()
  @IsUUID()
  findingId!: string;

  @ApiProperty({ enum: ServicePackReviewFindingStatus })
  @IsEnum(ServicePackReviewFindingStatus)
  status!: ServicePackReviewFindingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description:
      'Authority review only: never authenticates governing source without authority evaluation',
  })
  @IsOptional()
  @IsBoolean()
  governingSourceAuthenticated?: boolean;
}
