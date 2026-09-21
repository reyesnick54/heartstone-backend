import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocalizedLabelDto {
  @ApiProperty({ description: 'Default display label for the current locale context' })
  label!: string;

  @ApiPropertyOptional({
    description: 'Localization key for client-side translation',
    example: 'citizen.action.pay_invoice',
  })
  labelKey?: string;

  @ApiPropertyOptional({
    description: 'Optional structured labels keyed by locale code',
    example: { en: 'Pay invoice' },
  })
  labels?: Record<string, string>;
}
