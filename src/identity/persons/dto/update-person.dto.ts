import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePersonDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  givenName?: string;

  @ApiPropertyOptional({ example: 'Citizen' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  familyName?: string;

  @ApiPropertyOptional({ example: 'Jane Citizen' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}
