import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { PublicSafetyNoticeService } from './public-safety-notice.service';

@ApiTags('public-public-safety')
@Public()
@Controller('public/public-safety/notices')
export class PublicPublicSafetyNoticeController {
  constructor(private readonly notices: PublicSafetyNoticeService) {}

  @Get(':noticeReference')
  @ApiOperation({
    summary: 'Published public safety government notice (approved content only)',
  })
  getPublishedNotice(@Param('noticeReference') noticeReference: string) {
    return this.notices.getPublishedNoticeByReference(noticeReference);
  }
}
