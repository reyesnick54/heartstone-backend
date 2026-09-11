import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel, AuthenticationMethodType } from '@prisma/client';

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

  @ApiProperty({ enum: AuthenticationMethodType })
  authMethod!: AuthenticationMethodType;

  @ApiProperty()
  mfaSatisfied!: boolean;

  @ApiProperty()
  authenticatedAt!: Date;

  @ApiPropertyOptional()
  oidcProviderCode?: string | null;
}
