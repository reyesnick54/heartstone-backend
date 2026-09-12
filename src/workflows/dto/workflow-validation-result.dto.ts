import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowValidationIssueDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  path?: string;
}

export class WorkflowValidationResultDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty({ type: [WorkflowValidationIssueDto] })
  issues!: WorkflowValidationIssueDto[];
}
