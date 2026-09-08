import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;
}

export class ReadyResponseDto {
  @ApiProperty({ example: 'ready' })
  status!: string;
}

export class VersionResponseDto {
  @ApiProperty({ example: 'heartstone-backend' })
  name!: string;

  @ApiProperty({ example: 'v1' })
  apiVersion!: string;

  @ApiProperty({ example: 'development' })
  environment!: string;

  @ApiProperty({ example: '0.1.0', nullable: true })
  build!: string | null;
}
