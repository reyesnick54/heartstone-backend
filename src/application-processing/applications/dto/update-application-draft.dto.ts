import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

import { FREE_FORM_OBJECT_SCHEMA } from '../../../common/openapi/json-value.schema';

/** Body for `PATCH /applications/{id}/draft`. Only DRAFT applications can be updated. */
export class UpdateApplicationDraftDto {
  @ApiProperty({
    ...FREE_FORM_OBJECT_SCHEMA,
    description: 'Partial or complete draft answers keyed by form field key. Replaces the draft.',
  })
  @IsObject()
  draftAnswers!: Record<string, unknown>;
}
