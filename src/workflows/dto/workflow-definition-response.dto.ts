import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowDefinitionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiProperty({ format: 'uuid' })
  responsibleDepartmentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  institutionalOwnerOfficeId?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
