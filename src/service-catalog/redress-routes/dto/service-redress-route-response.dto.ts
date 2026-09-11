import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOperatingMetadataStatus, ServiceRedressRouteType } from '@prisma/client';

export class ServiceRedressRouteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceRedressRouteType })
  routeType!: ServiceRedressRouteType;

  @ApiProperty()
  routeName!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  responsibleInstitutionId?: string | null;

  @ApiPropertyOptional()
  deadlineDescription?: string | null;

  @ApiPropertyOptional()
  governingSourceId?: string | null;

  @ApiProperty()
  independenceRequired!: boolean;

  @ApiProperty()
  contactChannelMetadata!: Record<string, unknown>;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ enum: ServiceOperatingMetadataStatus })
  status!: ServiceOperatingMetadataStatus;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  decided!: false;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
