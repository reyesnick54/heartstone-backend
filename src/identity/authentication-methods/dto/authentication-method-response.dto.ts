import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel, AuthenticationMethodType } from '@prisma/client';

export class AuthenticationMethodResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty({ enum: AuthenticationMethodType })
  type!: AuthenticationMethodType;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty({ enum: AssuranceLevel })
  assuranceLevel!: AssuranceLevel;

  @ApiPropertyOptional()
  oidcIssuer?: string | null;

  @ApiPropertyOptional()
  oidcClientId?: string | null;

  @ApiPropertyOptional()
  oidcAudience?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
