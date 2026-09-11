import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  givenName!: string;

  @ApiProperty({ example: 'Citizen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  familyName!: string;

  @ApiPropertyOptional({ example: 'Jane Citizen' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}
