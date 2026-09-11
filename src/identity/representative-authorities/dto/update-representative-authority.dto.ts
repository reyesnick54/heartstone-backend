import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRepresentativeAuthorityDto {
  @ApiPropertyOptional({ example: 'Updated scope description' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  scopeDescription?: string;
}
