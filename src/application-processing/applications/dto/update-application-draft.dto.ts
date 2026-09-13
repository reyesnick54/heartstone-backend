import { IsObject } from 'class-validator';

export class UpdateApplicationDraftDto {
  @IsObject()
  draftAnswers!: Record<string, unknown>;
}
