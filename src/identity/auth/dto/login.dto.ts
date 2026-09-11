import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.citizen@example.gov' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  loginIdentifier!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password!: string;
}
