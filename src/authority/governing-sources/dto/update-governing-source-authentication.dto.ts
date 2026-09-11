import { ApiProperty } from '@nestjs/swagger';
import { SourceAuthenticationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateGoverningSourceAuthenticationDto {
  @ApiProperty({ enum: SourceAuthenticationStatus })
  @IsEnum(SourceAuthenticationStatus)
  authenticationStatus!: SourceAuthenticationStatus;
}
