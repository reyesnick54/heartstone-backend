import { ApiProperty } from '@nestjs/swagger';
import { IdentityAccountStatus, UserAccount, UserAccountKind } from '@prisma/client';

export class UserAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  personId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ enum: UserAccountKind })
  kind!: UserAccountKind;

  @ApiProperty({ enum: IdentityAccountStatus })
  status!: IdentityAccountStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(account: UserAccount): UserAccountResponseDto {
    return {
      id: account.id,
      personId: account.personId,
      username: account.username,
      kind: account.kind,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
