import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';

export class OfficialAppointmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  appointmentReference!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  scheduledStartsAt!: string | null;

  @ApiPropertyOptional()
  scheduledEndsAt!: string | null;

  @ApiPropertyOptional()
  reasonName!: string | null;

  @ApiProperty()
  departmentName!: string;

  @ApiPropertyOptional()
  serviceName!: string | null;

  @ApiProperty()
  isVirtual!: boolean;
}

export class OfficialAppointmentsListResponseDto {
  @ApiProperty({ type: [OfficialAppointmentSummaryDto] })
  items!: OfficialAppointmentSummaryDto[];

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}

export class OfficialAppointmentDetailResponseDto extends OfficialAppointmentSummaryDto {
  @ApiPropertyOptional()
  operationalNotes!: string | null;

  @ApiPropertyOptional()
  locationName!: string | null;

  @ApiProperty({ type: LocalizedLabelDto })
  completionDisclaimer!: LocalizedLabelDto;
}
