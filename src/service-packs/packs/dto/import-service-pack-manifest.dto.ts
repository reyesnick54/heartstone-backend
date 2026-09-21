import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class ImportServicePackManifestDto {
  @ApiProperty({
    description: 'Versioned service pack manifest payload',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  manifest!: Record<string, unknown>;
}
