import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import { FREE_FORM_OBJECT_SCHEMA } from '../../../common/openapi/json-value.schema';

/**
 * Body for `POST /applications/{id}/submit` and `POST /applications/{id}/corrections`.
 *
 * Answers are validated server-side against the application's pinned form version; the
 * configuration fingerprint must match the one the draft was created under.
 */
export class SubmitApplicationDto {
  @ApiProperty({
    ...FREE_FORM_OBJECT_SCHEMA,
    description:
      'Form answers keyed by form field key. Shape is defined by the pinned form version, not by code.',
  })
  @IsObject()
  answers!: Record<string, unknown>;

  @ApiProperty({
    description:
      'Configuration fingerprint returned when the draft was created; submission is refused if the service configuration changed.',
  })
  @IsString()
  @IsNotEmpty()
  configurationFingerprint!: string;

  @ApiPropertyOptional({
    description:
      'Client-generated key that makes a retried submission safe. Scoped to the signed-in applicant.',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
