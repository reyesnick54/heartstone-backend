import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class UserAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  personId?: string | null;

  @ApiProperty()
  loginIdentifier!: string;

  @ApiProperty({ enum: AccountStatus })
  status!: AccountStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
