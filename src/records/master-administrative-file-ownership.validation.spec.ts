import { BadRequestException } from '@nestjs/common';
import { IdentityType, StructuralLifecycleStatus } from '@prisma/client';

import {
  assertActorMayInitializeMasterFile,
  assertInstitutionalOfficeEligible,
} from './common/master-administrative-file-ownership.validation';

describe('MasterAdministrativeFile ownership validation', () => {
  it('rejects vendor office codes', () => {
    expect(() => {
      assertInstitutionalOfficeEligible({
        code: 'VENDOR-SUPPORT',
        status: StructuralLifecycleStatus.ACTIVE,
      });
    }).toThrow(BadRequestException);
  });

  it('rejects service office codes', () => {
    expect(() => {
      assertInstitutionalOfficeEligible({
        code: 'SERVICE-ACCOUNT',
        status: StructuralLifecycleStatus.ACTIVE,
      });
    }).toThrow(BadRequestException);
  });

  it('rejects AI office codes', () => {
    expect(() => {
      assertInstitutionalOfficeEligible({
        code: 'AI-ASSISTANT',
        status: StructuralLifecycleStatus.ACTIVE,
      });
    }).toThrow(BadRequestException);
  });

  it('allows active institutional offices', () => {
    expect(() => {
      assertInstitutionalOfficeEligible({
        code: 'RECORDS-CUSTODIAN',
        status: StructuralLifecycleStatus.ACTIVE,
      });
    }).not.toThrow();
  });

  it('rejects service identities initializing master files', () => {
    expect(() => {
      assertActorMayInitializeMasterFile({ actorIdentityType: IdentityType.SERVICE });
    }).toThrow(BadRequestException);
  });
});
