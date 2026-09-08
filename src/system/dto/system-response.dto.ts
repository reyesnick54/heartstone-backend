import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;
}

export class ReadinessChecksDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database!: 'up' | 'down';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  redis!: 'up' | 'down';
}

export class ReadyResponseDto {
  @ApiProperty({ enum: ['ready', 'not_ready'], example: 'ready' })
  status!: 'ready' | 'not_ready';

  @ApiProperty({ type: ReadinessChecksDto })
  checks!: ReadinessChecksDto;
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
