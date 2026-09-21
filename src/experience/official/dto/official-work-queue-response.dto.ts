import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OfficialWorkQueueEntryDto {
  @ApiProperty()
  queueItemType!: string;

  @ApiProperty()
  priority!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  institutionName!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  caseId!: string | null;

  @ApiPropertyOptional()
  caseNumber!: string | null;

  @ApiPropertyOptional()
  serviceName!: string | null;

  @ApiPropertyOptional()
  deadlineAt!: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  assignedOfficeholderId!: string | null;

  @ApiPropertyOptional()
  assignedOfficeholderName!: string | null;

  @ApiProperty()
  actionRoute!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  sortKey!: string;
}

export class OfficialWorkQueueResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: [OfficialWorkQueueEntryDto] })
  items!: OfficialWorkQueueEntryDto[];

  @ApiProperty()
  totalCount!: number;
}
