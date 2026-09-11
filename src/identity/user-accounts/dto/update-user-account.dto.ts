import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateUserAccountDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Link or update the associated person' })
  @IsOptional()
  @IsUUID()
  personId?: string;
}
