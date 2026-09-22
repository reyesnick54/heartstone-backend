import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { PROPERTY_REASON_CODES } from '../property-registry.constants';

export class PropertyRegistryAccessDeniedException extends ForbiddenException {
  constructor() {
    super(PROPERTY_REASON_CODES.CROSS_PARCEL_ACCESS_DENIED);
  }
}

export class PropertyTransferApplicationMutationException extends ForbiddenException {
  constructor() {
    super(PROPERTY_REASON_CODES.TRANSFER_APPLICATION_CANNOT_MUTATE_TITLE);
  }
}

export class PropertyTransferDecisionRequiredException extends ForbiddenException {
  constructor() {
    super(PROPERTY_REASON_CODES.TRANSFER_DECISION_REQUIRED);
  }
}

export class PropertySurveyParcelMutationException extends BadRequestException {
  constructor() {
    super(PROPERTY_REASON_CODES.SURVEY_CANNOT_ALTER_PARCEL);
  }
}

export class PropertyPlatformAdminTitleMutationException extends ForbiddenException {
  constructor() {
    super(PROPERTY_REASON_CODES.PLATFORM_ADMIN_CANNOT_ALTER_TITLE);
  }
}

export class PropertyPublicVerificationDisabledException extends ForbiddenException {
  constructor() {
    super(PROPERTY_REASON_CODES.PUBLIC_VERIFICATION_DISABLED);
  }
}

export class PropertyPublicVerificationNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`No public property record matches reference: ${reference}`);
  }
}

export class PropertyCertificateRegistryVersionException extends BadRequestException {
  constructor() {
    super(PROPERTY_REASON_CODES.CERTIFICATE_REQUIRES_REGISTRY_VERSION);
  }
}
