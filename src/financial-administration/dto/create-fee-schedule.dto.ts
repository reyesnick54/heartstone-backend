import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateFeeScheduleDto {
  @ApiProperty({ example: 'FS-LICENCE-2026' })
  @IsString()
  @Length(2, 64)
  code!: string;

  @ApiProperty({ example: 'ABSEZ Licence Fee Schedule 2026' })
  @IsString()
  @Length(2, 256)
  name!: string;

  @ApiProperty()
  @IsUUID()
  responsibleInstitutionId!: string;

  @ApiProperty()
  @IsUUID()
  responsibleDepartmentId!: string;

  @ApiProperty({ example: 'XCD', default: 'XCD' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}
