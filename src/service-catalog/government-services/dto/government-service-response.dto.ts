import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceLifecycleStatus } from '@prisma/client';

export class GovernmentServiceResponseDto {
  @ApiProperty()

export class GovernmentServiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  responsibleInstitutionId!: string;

  @ApiProperty({ enum: ServiceLifecycleStatus })
  status!: ServiceLifecycleStatus;
  slug!: string;

  @ApiProperty()
  officialName!: string;

  @ApiProperty()
  publicName!: string;

  @ApiPropertyOptional()
  summary?: string | null;

  @ApiProperty({ format: 'uuid' })
  responsibleInstitutionId!: string;

  @ApiProperty({ format: 'uuid' })
  responsibleDepartmentId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceFamilyId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
