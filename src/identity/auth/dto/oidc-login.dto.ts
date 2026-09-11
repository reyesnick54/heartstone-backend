import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OidcLoginDto {
  @ApiProperty({ description: 'OIDC access token from the external identity provider' })
  @IsString()
  @MaxLength(8192)
  accessToken!: string;

  @ApiPropertyOptional({ description: 'Configured OIDC provider code' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerCode?: string;
}
