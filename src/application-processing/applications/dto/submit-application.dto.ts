import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitApplicationDto {
  @IsObject()
  answers!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  configurationFingerprint!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
