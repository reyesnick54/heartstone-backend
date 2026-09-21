import { ApiProperty } from '@nestjs/swagger';

export class DeepLinkDto {
  @ApiProperty({
    description: 'Stable route identifier for frontend navigation',
    example: 'citizen.application.detail',
  })
  route!: string;

  @ApiProperty({
    description: 'Route parameters for frontend deep linking',
    example: { applicationId: '00000000-0000-4000-8000-000000000001' },
  })
  params!: Record<string, string>;
}
