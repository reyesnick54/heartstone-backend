-- S10 part 2: backfill and rename after enum values are committed

UPDATE "function_authority_records"
SET "classification" = 'INSTITUTION_OWNED'
WHERE "classification" = 'ABSEZ_OWNED';

UPDATE "function_authority_records"
SET "classification" = 'INSTITUTION_DELEGATED'
WHERE "classification" = 'ABSEZ_DELEGATED';

UPDATE "official_instruments"
SET "issuerSource" = 'INSTITUTION_ISSUED'
WHERE "issuerSource" = 'ABSEZ_ISSUED';

ALTER TABLE "official_instruments"
  ALTER COLUMN "issuerSource" SET DEFAULT 'INSTITUTION_ISSUED';

UPDATE "official_instruments"
SET "jurisdictionScope" = 'OPERATING_JURISDICTION'
WHERE "jurisdictionScope" = 'ABSEZ';

UPDATE "metric_definition_versions"
SET "dependencyTimeClassification" = 'INSTITUTION_CONTROLLED_TIME'
WHERE "dependencyTimeClassification" = 'ABSEZ_CONTROLLED_TIME';

UPDATE "metric_observations"
SET "classification" = 'INSTITUTION_CONTROLLED_TIME'
WHERE "classification" = 'ABSEZ_CONTROLLED_TIME';

UPDATE "metric_dependency_classifications"
SET "classification" = 'INSTITUTION_CONTROLLED_TIME'
WHERE "classification" = 'ABSEZ_CONTROLLED_TIME';

ALTER TABLE "external_dependency_determinations"
  RENAME COLUMN "effectOnAbsezAction" TO "effectOnInstitutionAction";
