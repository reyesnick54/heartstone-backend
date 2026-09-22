import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';

import { type PortableExportPurpose } from '../portable-package.types';

const EXPORT_PURPOSES = [
  'BACKUP',
  'AUDIT',
  'CONTROLLED_PORTABILITY',
  'TEMPLATE_REUSE',
  'ENVIRONMENT_PROMOTION',
] as const satisfies readonly PortableExportPurpose[];

export class ExportServicePackVersionDto {
  @ApiProperty({ enum: EXPORT_PURPOSES })
  @IsNotEmpty()
  @IsIn(EXPORT_PURPOSES)
  exportPurpose!: PortableExportPurpose;
}
