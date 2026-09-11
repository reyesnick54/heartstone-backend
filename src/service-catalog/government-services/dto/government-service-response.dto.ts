import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceLifecycleStatus } from '@prisma/client';

export class GovernmentServiceResponseDto {
  @ApiProperty()
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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
