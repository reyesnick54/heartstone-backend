import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsUUID } from 'class-validator';

export class SubmitPropertyCorrectionRequestDto {
  @ApiProperty()
  @IsUUID()
  propertyRegistryEntryId!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  requestedChanges!: Record<string, unknown>;
}
