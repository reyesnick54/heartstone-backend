import { ApiProperty } from '@nestjs/swagger';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

export class AuthorityEvaluationResponseDto {
  @ApiProperty({ format: 'uuid' })
  evaluationId!: string;

  @ApiProperty({ format: 'uuid' })
  functionAuthorityRecordId!: string;

  @ApiProperty({ format: 'uuid' })
  identityId!: string;

  @ApiProperty({ enum: AuthorityActionType })
  action!: AuthorityActionType;

  @ApiProperty({ enum: AuthorityEvaluationOutcome })
  outcome!: AuthorityEvaluationOutcome;

  @ApiProperty({ type: [String] })
  explanationCodes!: string[];

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  safeHalt!: boolean;

  @ApiProperty()
  requiresRevalidation!: boolean;

  @ApiProperty()
  evaluatedAt!: Date;
}
