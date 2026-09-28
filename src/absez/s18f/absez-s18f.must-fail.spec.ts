import { ImmigrationActorPersona } from '@prisma/client';

import { FreeZoneCustomsBoundaryService } from './customs/free-zone-customs-boundary.service';
import { InvestorResidencyProgramService } from './immigration/investor-residency-program.service';
import { ZoneLandLeaseService } from './land/zone-land-lease.service';

describe('Remediation S18F must-fail invariants', () => {
  const customsBoundary = new FreeZoneCustomsBoundaryService();

  it('rejects applicant-forged national customs authentication fields', () => {
    expect(() => {
      customsBoundary.rejectApplicantForgedNationalCustomsDetermination(
        { isAuthenticated: true },
        false,
      );
    }).toThrow();
  });

  it('documents lease does not imply planning permission flag', () => {
    const leaseService = new ZoneLandLeaseService({} as never);
    expect(() => {
      leaseService.assertLeaseDoesNotImplyPlanning({ doesNotImplyPlanningPermission: false });
    }).toThrow();
  });

  it('payment persona cannot approve immigration through residency service boundary', async () => {
    const immigrationBoundary = {
      assertPaymentDoesNotApproveImmigrationCase: (persona: ImmigrationActorPersona) => {
        if (persona === ImmigrationActorPersona.PAYMENT_SYSTEM) {
          throw new Error('payment blocked');
        }
      },
    };
    const prisma = {
      investorResidencyProgramApplication: {
        findUniqueOrThrow: () => ({
          id: 'app-id',
          immigrationProfileId: 'profile-id',
          paymentDoesNotGrantResidency: true,
        }),
      },
      residencyPermitRecord: { count: () => 0 },
    };
    const service = new InvestorResidencyProgramService(
      prisma as never,
      immigrationBoundary as never,
      {} as never,
    );
    await expect(
      service.recordInvestmentPayment(ImmigrationActorPersona.PAYMENT_SYSTEM, 'app-id'),
    ).rejects.toThrow('payment blocked');
  });
});
