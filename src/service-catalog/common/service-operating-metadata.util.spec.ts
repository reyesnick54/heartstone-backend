import { ServiceOperatingMetadataStatus } from '@prisma/client';

import {
  dependencyMetadataDoesNotTransferAuthority,
  isCurrentOperatingMetadata,
  outputDefinitionDoesNotIssue,
  redressRouteDoesNotDecideAppeal,
  slaExpiryDoesNotImplyApproval,
  waiverAvailabilityDoesNotWaiveFee,
} from './service-operating-metadata.util';

describe('service-operating-metadata.util (Phase 5E)', () => {
  const activePeriod = {
    status: ServiceOperatingMetadataStatus.ACTIVE,
    effectiveFrom: new Date('2024-01-01'),
    effectiveUntil: new Date('2025-01-01'),
  };

  it('treats expired fee metadata as not current', () => {
    expect(isCurrentOperatingMetadata(activePeriod, new Date('2025-06-01'))).toBe(false);
  });

  it('treats active fee metadata within period as current', () => {
    expect(isCurrentOperatingMetadata(activePeriod, new Date('2024-06-01'))).toBe(true);
  });

  it('does not treat draft metadata as current even within period', () => {
    expect(
      isCurrentOperatingMetadata(
        {
          ...activePeriod,
          status: ServiceOperatingMetadataStatus.DRAFT,
        },
        new Date('2024-06-01'),
      ),
    ).toBe(false);
  });

  it('does not waive fee when waiver availability is true', () => {
    const result = waiverAvailabilityDoesNotWaiveFee(true);
    expect(result.waiverReductionAvailable).toBe(true);
    expect(result.waived).toBe(false);
  });

  it('does not imply approval when SLA target expires', () => {
    const result = slaExpiryDoesNotImplyApproval();
    expect(result.approved).toBe(false);
    expect(result.reason).toBe('SLA_METADATA_ONLY');
  });

  it('does not transfer authority from dependency metadata', () => {
    const result = dependencyMetadataDoesNotTransferAuthority();
    expect(result.authorityTransferred).toBe(false);
    expect(result.metadataOnly).toBe(true);
  });

  it('does not issue certificate from output definition metadata', () => {
    const result = outputDefinitionDoesNotIssue('CERTIFICATE');
    expect(result.issued).toBe(false);
    expect(result.outputType).toBe('CERTIFICATE');
  });

  it('does not make decision from decision output definition metadata', () => {
    const result = outputDefinitionDoesNotIssue('DECISION');
    expect(result.issued).toBe(false);
    expect(result.outputType).toBe('DECISION');
  });

  it('does not decide appeal from appeal route metadata', () => {
    const result = redressRouteDoesNotDecideAppeal('APPEAL');
    expect(result.decided).toBe(false);
    expect(result.routeType).toBe('APPEAL');
  });
});
