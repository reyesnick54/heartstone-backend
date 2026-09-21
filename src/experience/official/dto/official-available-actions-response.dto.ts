import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

export class OfficialAvailableActionDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  available!: boolean;

  @ApiProperty()
  isConsequential!: boolean;

  @ApiPropertyOptional({ enum: AuthorityActionType })
  authorityAction!: AuthorityActionType | null;

  @ApiPropertyOptional({ format: 'uuid' })
  functionAuthorityRecordId!: string | null;

  @ApiPropertyOptional({ enum: AuthorityEvaluationOutcome })
  evaluationOutcome!: AuthorityEvaluationOutcome | null;

  @ApiPropertyOptional()
  unavailableReason!: string | null;

  @ApiProperty()
  executionRoute!: string;

  @ApiProperty()
  requiresExecutionTimeRevalidation!: true;
}

export class OfficialAvailableActionsResponseDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  evaluatedAt!: string;

  @ApiProperty({ type: [OfficialAvailableActionDto] })
  actions!: OfficialAvailableActionDto[];

  @ApiProperty({
    description:
      'Available actions are descriptive only; execution endpoints re-evaluate authority',
  })
  executionRequiresAuthorityRevalidation!: true;
}
