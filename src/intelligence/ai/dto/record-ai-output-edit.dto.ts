import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordAiOutputEditDto {
  @IsUUID()
  callRecordId!: string;

  @IsString()
  @MaxLength(32000)
  editedOutput!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  editReason?: string;
}
