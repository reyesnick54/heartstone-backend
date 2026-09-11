import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  givenName!: string;

  @ApiProperty()
  familyName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
