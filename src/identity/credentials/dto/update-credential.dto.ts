import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCredentialDto {
  @ApiPropertyOptional({ example: 'oidc-provider' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcProvider?: string;

  @ApiPropertyOptional({ example: 'subject-123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcSubject?: string;
}
