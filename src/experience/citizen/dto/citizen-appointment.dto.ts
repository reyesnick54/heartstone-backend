import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class CitizenAppointmentSummaryDto {
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
  isVirtual!: boolean;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  attribution?: InstitutionAttributionDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}

export class CitizenAppointmentsResponseDto {
  @ApiProperty({ type: [CitizenAppointmentSummaryDto] })
  items!: CitizenAppointmentSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class CitizenAppointmentDetailDto extends CitizenAppointmentSummaryDto {
  @ApiPropertyOptional()
  virtualMeetingUrl!: string | null;

  @ApiPropertyOptional()
  locationName!: string | null;

  @ApiProperty({ type: [String] })
  availableActions!: string[];
}
