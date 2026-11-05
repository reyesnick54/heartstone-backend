import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The authenticating officer is always the signed-in identity (never a request field).
 * The body may only describe where the verified copy can be found.
 */
export class AuthenticateGoverningSourceDto {
  @ApiPropertyOptional({
    description:
      'Where the verified, executed copy is held (gazette reference, registry entry, file number)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  verificationReference?: string;
}
