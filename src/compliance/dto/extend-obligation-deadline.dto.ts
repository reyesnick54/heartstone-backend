import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID, MaxLength } from 'class-validator';

export class ExtendObligationDeadlineDto {
  @ApiProperty()
  @IsUUID()
  obligationId!: string;

  @ApiProperty({ description: 'Authority reference authorizing the extension' })
  @IsString()
  @MaxLength(500)
  extensionAuthorityReference!: string;

  @ApiProperty()
  @IsDateString()
  effectiveExtendedDueDate!: string;
}
