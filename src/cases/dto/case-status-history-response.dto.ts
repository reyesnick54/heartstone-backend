import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseLegalStatus, CaseStatus } from '@prisma/client';

export class CaseStatusHistoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  caseId!: string;

  @ApiPropertyOptional({ enum: CaseStatus })
  previousStatus?: CaseStatus | null;

  @ApiProperty({ enum: CaseStatus })
  newStatus!: CaseStatus;

  @ApiPropertyOptional({ enum: CaseLegalStatus })
  previousLegalStatus?: CaseLegalStatus | null;

  @ApiProperty({ enum: CaseLegalStatus })
  newLegalStatus!: CaseLegalStatus;

  @ApiProperty()
  actorIdentityId!: string;

  @ApiPropertyOptional()
  officeholderId?: string | null;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  correlationId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
