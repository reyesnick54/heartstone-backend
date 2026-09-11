import { ApiProperty } from '@nestjs/swagger';
import { AssuranceLevel } from '@prisma/client';

export class LoginResponseDto {
  @ApiProperty()
  sessionToken!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ enum: AssuranceLevel })
  assuranceLevel!: AssuranceLevel;
}
