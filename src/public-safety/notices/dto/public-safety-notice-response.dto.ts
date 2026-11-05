import { ApiProperty } from '@nestjs/swagger';
import { PublicSafetyOfficialNoticeStatus } from '@prisma/client';

/** A published public safety notice. Draft content is never returned. */
export class PublicSafetyNoticeResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  noticeReference!: string;

  @ApiProperty({ enum: PublicSafetyOfficialNoticeStatus })
  status!: PublicSafetyOfficialNoticeStatus;

  @ApiProperty({ description: 'Published (or approved) notice content' })
  content!: string;

  @ApiProperty({ type: String, nullable: true })
  publishedAt!: string | null;
}
