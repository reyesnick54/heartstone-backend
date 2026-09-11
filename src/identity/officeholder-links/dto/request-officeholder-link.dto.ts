import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestOfficeholderLinkDto {
  @ApiProperty()
  @IsUUID()
  officeholderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceReference?: string;
}
