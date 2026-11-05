import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({ enum: [true], description: 'Always true once the current session is revoked' })
  revoked!: boolean;
}

export class LogoutAllResponseDto {
  @ApiProperty({ description: 'Number of sessions revoked for the current user account' })
  revokedCount!: number;
}
