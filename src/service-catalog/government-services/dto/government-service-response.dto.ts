import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GovernmentServiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
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
