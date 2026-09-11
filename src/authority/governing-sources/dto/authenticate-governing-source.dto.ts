import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AuthenticateGoverningSourceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  authenticatedByIdentityId!: string;
}
