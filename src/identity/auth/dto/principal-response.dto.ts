import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrincipalKind, UserAccountKind } from '@prisma/client';

import { AuthenticatedPrincipal, AuthenticatedPrincipalKind } from '../principal.types';

export class PrincipalResponseDto {
  @ApiProperty({ enum: PrincipalKind })
  kind!: AuthenticatedPrincipalKind;

  @ApiProperty()
  accountId!: string;

  @ApiPropertyOptional()
  personId?: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional({ enum: UserAccountKind })
  accountKind?: UserAccountKind;

  @ApiProperty()
  sessionId!: string;

  @ApiPropertyOptional()
  correlationId?: string;

  @ApiPropertyOptional()
  verifiedOfficeholderLinkId?: string;

  @ApiPropertyOptional()
  verifiedOfficeholderId?: string;

  static fromPrincipal(principal: AuthenticatedPrincipal): PrincipalResponseDto {
    return {
      kind: principal.kind,
      accountId: principal.accountId,
      personId: principal.personId,
      username: principal.username,
      accountKind: principal.accountKind,
      sessionId: principal.sessionId,
      correlationId: principal.correlationId,
      verifiedOfficeholderLinkId: principal.verifiedOfficeholderLinkId,
      verifiedOfficeholderId: principal.verifiedOfficeholderId,
    };
  }
}

export class LoginResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty({ type: PrincipalResponseDto })
  principal!: PrincipalResponseDto;
}
