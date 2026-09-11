import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel, AuthenticationMethodType, IdentityType } from '@prisma/client';

export class SessionContextDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  identityId!: string;

  @ApiPropertyOptional()
  userAccountId?: string | null;

  @ApiProperty({ enum: AssuranceLevel })
  assuranceLevel!: AssuranceLevel;

  @ApiProperty({ enum: AuthenticationMethodType })
  authMethod!: AuthenticationMethodType;

  @ApiPropertyOptional()
  oidcProviderCode?: string | null;

  @ApiProperty()
  mfaSatisfied!: boolean;

  @ApiProperty()
  authenticatedAt!: Date;

  @ApiProperty({ enum: IdentityType })
  identityType!: IdentityType;

  @ApiProperty()
  isServicePrincipal!: boolean;
}
