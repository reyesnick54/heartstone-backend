import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class FreezePacketDto {
  @ApiPropertyOptional({
    description:
      'Marks packet as ready for decision engine review. Does not create a decision outcome.',
  })
  @IsOptional()
  @IsBoolean()
  readyForDecisionReview?: boolean;
}
