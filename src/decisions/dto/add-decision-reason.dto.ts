import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddDecisionReasonDto {
  @ApiProperty()
  @IsString()
  reasonText!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authorityReference?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  findingReferences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  evidenceReferences?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  limitationDisclosure?: string;

  @ApiProperty()
  @IsUUID()
  decisionMakerOfficeholderId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assistanceRecordId?: string;
}
