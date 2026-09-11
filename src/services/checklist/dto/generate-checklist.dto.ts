import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class GenerateChecklistDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceVersionId!: string;

  @ApiPropertyOptional({
    description: 'Applicant or pre-application facts used to evaluate conditional requirements',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  facts?: Record<string, unknown>;
}
