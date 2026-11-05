import { ApiProperty } from '@nestjs/swagger';

/** Non-confidential customs trader facts returned by public verification. */
export class PublicCustomsTradeVerificationResponseDto {
  @ApiProperty()
  reference!: string;

  @ApiProperty({ enum: ['UNKNOWN', 'VALID_FORMAT', 'NOT_FOUND'] })
  verificationState!: 'UNKNOWN' | 'VALID_FORMAT' | 'NOT_FOUND';

  @ApiProperty()
  ruleEnvironment!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      oneOf: [{ type: 'string' }, { type: 'boolean' }],
      nullable: true,
    },
    description:
      'Policy-permitted public facts keyed by fact name (e.g. importerRegistered, exporterRegistered); empty when not found',
  })
  publicFacts!: Record<string, string | boolean | null>;
}
