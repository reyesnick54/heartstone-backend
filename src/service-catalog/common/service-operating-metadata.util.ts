import { ServiceOperatingMetadataStatus } from '@prisma/client';

import { type EffectivePeriod, isEffectiveAt } from '../../authority/common/effective-period.util';

export interface OperatingMetadataRecord extends EffectivePeriod {
  status: ServiceOperatingMetadataStatus;
}

export function isCurrentOperatingMetadata(
  record: OperatingMetadataRecord,
  at: Date = new Date(),
): boolean {
  if (record.status !== ServiceOperatingMetadataStatus.ACTIVE) {
    return false;
  }

  return isEffectiveAt(record, at);
}

export function waiverAvailabilityDoesNotWaiveFee(waiverReductionAvailable: boolean): {
  waived: false;
  waiverReductionAvailable: boolean;
} {
  return {
    waived: false,
    waiverReductionAvailable,
  };
}

export function slaExpiryDoesNotImplyApproval(): {
  approved: false;
  reason: 'SLA_METADATA_ONLY';
} {
  return {
    approved: false,
    reason: 'SLA_METADATA_ONLY',
  };
}

export function dependencyMetadataDoesNotTransferAuthority(): {
  authorityTransferred: false;
  metadataOnly: true;
} {
  return {
    authorityTransferred: false,
    metadataOnly: true,
  };
}

export function outputDefinitionDoesNotIssue(outputType: string): {
  issued: false;
  outputType: string;
} {
  return {
    issued: false,
    outputType,
  };
}

export function redressRouteDoesNotDecideAppeal(routeType: string): {
  decided: false;
  routeType: string;
} {
  return {
    decided: false,
    routeType,
  };
}
