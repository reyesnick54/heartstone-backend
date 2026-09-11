import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel } from '@prisma/client';

export class SessionContextDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  identityId!: string;

  @ApiPropertyOptional()
  userAccountId?: string | null;

  @ApiProperty({ enum: AssuranceLevel })
  assuranceLevel!: AssuranceLevel;
}
