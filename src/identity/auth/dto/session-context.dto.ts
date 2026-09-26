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

  @ApiPropertyOptional({ enum: AuthenticationMethodType })
  authMethod?: AuthenticationMethodType;

  @ApiPropertyOptional()
  mfaSatisfied?: boolean;

  @ApiPropertyOptional()
  authenticatedAt?: Date;

  @ApiPropertyOptional()
  oidcProviderCode?: string | null;

  @ApiPropertyOptional({ enum: IdentityType })
  identityType?: IdentityType;

  @ApiPropertyOptional()
  isServicePrincipal?: boolean;
}
