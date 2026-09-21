import { ApiProperty } from '@nestjs/swagger';

export class DepartmentMetricsFreshnessDto {
  @ApiProperty()
  calculatedAt!: string;

  @ApiProperty()
  staleAfter!: string;

  @ApiProperty()
  isStale!: boolean;

  @ApiProperty()
  staleDataDisclaimer!: string;
}

export class DepartmentOfficerWorkloadDistributionDto {
  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty()
  officeholderName!: string;

  @ApiProperty()
  activeAssignmentCount!: number;
}

export class DepartmentServiceAvailabilityDto {
  @ApiProperty()
  publicAvailability!: string;

  @ApiProperty()
  count!: number;
}
