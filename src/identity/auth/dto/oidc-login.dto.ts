import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OidcLoginDto {
  @ApiProperty({ description: 'OIDC access token from the identity provider' })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiPropertyOptional({ description: 'Configured provider code when multiple IdPs are enabled' })
  @IsOptional()
  @IsString()
  providerCode?: string;
}
