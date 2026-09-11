import { ApiProperty } from '@nestjs/swagger';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationStatus } from '../../policy/authority-evaluation-status.enum';

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

  @ApiProperty({
    enum: AuthorityEvaluationStatus,
    description:
      'Phase 4F structured status derived from outcome and explanation codes. Not a universal permission.',
  })
  status!: AuthorityEvaluationStatus;

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
