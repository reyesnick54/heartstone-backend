import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UserLoginDto {
  @ApiProperty()
  @IsString()
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class ServiceLoginDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  apiKey!: string;
}
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
