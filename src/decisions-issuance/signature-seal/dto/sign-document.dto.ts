import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SignDocumentDto {
  @ApiProperty()
  @IsUUID()
  officeholderId!: string;

  @ApiProperty()
  @IsUUID()
  appointmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegationId?: string;

  @ApiProperty()
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiProperty()
  @IsUUID()
  documentVersionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(64)
  documentHash!: string;

  @ApiProperty()
  @IsString()
  instrumentType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  intentStatement!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfaVerified?: boolean;
}
