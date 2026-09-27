-- S10 part 1: add institution-neutral enum values (must commit before backfill)

ALTER TYPE "AuthorityClassification" ADD VALUE IF NOT EXISTS 'INSTITUTION_OWNED';
ALTER TYPE "AuthorityClassification" ADD VALUE IF NOT EXISTS 'INSTITUTION_DELEGATED';

ALTER TYPE "InstrumentIssuerSource" ADD VALUE IF NOT EXISTS 'INSTITUTION_ISSUED';

ALTER TYPE "InstrumentJurisdictionScope" ADD VALUE IF NOT EXISTS 'OPERATING_JURISDICTION';

ALTER TYPE "MetricDependencyTimeClassification" ADD VALUE IF NOT EXISTS 'INSTITUTION_CONTROLLED_TIME';
