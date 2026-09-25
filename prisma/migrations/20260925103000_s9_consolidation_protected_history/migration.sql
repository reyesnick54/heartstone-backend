-- S9: canonical domain links and protected-history FK behavior (Restrict audit/history)

ALTER TABLE "civil_registry_vital_records"
  ADD COLUMN "vitalEventId" UUID,
  ADD COLUMN "civilRegistryEntryId" UUID;

CREATE UNIQUE INDEX "civil_registry_vital_records_vitalEventId_key"
  ON "civil_registry_vital_records"("vitalEventId");
CREATE UNIQUE INDEX "civil_registry_vital_records_civilRegistryEntryId_key"
  ON "civil_registry_vital_records"("civilRegistryEntryId");
CREATE INDEX "civil_registry_vital_records_vitalEventId_idx"
  ON "civil_registry_vital_records"("vitalEventId");
CREATE INDEX "civil_registry_vital_records_civilRegistryEntryId_idx"
  ON "civil_registry_vital_records"("civilRegistryEntryId");

ALTER TABLE "civil_registry_vital_records"
  ADD CONSTRAINT "civil_registry_vital_records_vitalEventId_fkey"
  FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_vital_records"
  ADD CONSTRAINT "civil_registry_vital_records_civilRegistryEntryId_fkey"
  FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_parcels" ADD COLUMN "landParcelId" UUID;

CREATE UNIQUE INDEX "property_parcels_landParcelId_key" ON "property_parcels"("landParcelId");
CREATE INDEX "property_parcels_landParcelId_idx" ON "property_parcels"("landParcelId");

ALTER TABLE "property_parcels"
  ADD CONSTRAINT "property_parcels_landParcelId_fkey"
  FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill civil registry links where case and vital event align
UPDATE "civil_registry_vital_records" AS vr
SET "vitalEventId" = ve."id"
FROM "vital_events" AS ve
WHERE vr."vitalEventId" IS NULL
  AND vr."registrationCaseId" IS NOT NULL
  AND ve."caseId" = vr."registrationCaseId";

UPDATE "civil_registry_vital_records" AS vr
SET "civilRegistryEntryId" = ce."id"
FROM "civil_registry_entries" AS ce
WHERE vr."civilRegistryEntryId" IS NULL
  AND vr."vitalEventId" IS NOT NULL
  AND ce."vitalEventId" = vr."vitalEventId";

-- Backfill property parcel cadastre links by shared parcel reference within jurisdiction
UPDATE "property_parcels" AS pp
SET "landParcelId" = lp."id"
FROM "land_parcels" AS lp
WHERE pp."landParcelId" IS NULL
  AND pp."parcelReference" = lp."parcelReference"
  AND pp."jurisdictionId" = lp."jurisdictionId";

-- Protected history: replace destructive cascades with RESTRICT

ALTER TABLE "civil_registry_audit_events" DROP CONSTRAINT IF EXISTS "civil_registry_audit_events_vitalEventId_fkey";
ALTER TABLE "civil_registry_audit_events"
  ADD CONSTRAINT "civil_registry_audit_events_vitalEventId_fkey"
  FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_audit_events" DROP CONSTRAINT IF EXISTS "civil_registry_audit_events_civilRegistryEntryId_fkey";
ALTER TABLE "civil_registry_audit_events"
  ADD CONSTRAINT "civil_registry_audit_events_civilRegistryEntryId_fkey"
  FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_registry_audit_events" DROP CONSTRAINT IF EXISTS "property_registry_audit_events_propertyRegistryEntryId_fkey";
ALTER TABLE "property_registry_audit_events"
  ADD CONSTRAINT "property_registry_audit_events_propertyRegistryEntryId_fkey"
  FOREIGN KEY ("propertyRegistryEntryId") REFERENCES "property_registry_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_registry_audit_events" DROP CONSTRAINT IF EXISTS "property_registry_audit_events_propertyTransferId_fkey";
ALTER TABLE "property_registry_audit_events"
  ADD CONSTRAINT "property_registry_audit_events_propertyTransferId_fkey"
  FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_audit_events" DROP CONSTRAINT IF EXISTS "document_audit_events_documentRecordId_fkey";
ALTER TABLE "document_audit_events"
  ADD CONSTRAINT "document_audit_events_documentRecordId_fkey"
  FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_status_history" DROP CONSTRAINT IF EXISTS "case_status_history_caseId_fkey";
ALTER TABLE "case_status_history"
  ADD CONSTRAINT "case_status_history_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_pack_deployment_audit_records" DROP CONSTRAINT IF EXISTS "service_pack_deployment_audit_records_servicePackDeploymentId_fkey";
ALTER TABLE "service_pack_deployment_audit_records"
  ADD CONSTRAINT "service_pack_deployment_audit_records_servicePackDeploymentId_fkey"
  FOREIGN KEY ("servicePackDeploymentId") REFERENCES "service_pack_deployments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_vital_record_versions" DROP CONSTRAINT IF EXISTS "civil_registry_vital_record_versions_vitalRecordId_fkey";
ALTER TABLE "civil_registry_vital_record_versions"
  ADD CONSTRAINT "civil_registry_vital_record_versions_vitalRecordId_fkey"
  FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_record_entitlements" DROP CONSTRAINT IF EXISTS "civil_registry_record_entitlements_vitalRecordId_fkey";
ALTER TABLE "civil_registry_record_entitlements"
  ADD CONSTRAINT "civil_registry_record_entitlements_vitalRecordId_fkey"
  FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_record_entitlements" DROP CONSTRAINT IF EXISTS "civil_registry_record_entitlements_identityId_fkey";
ALTER TABLE "civil_registry_record_entitlements"
  ADD CONSTRAINT "civil_registry_record_entitlements_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_certificates" DROP CONSTRAINT IF EXISTS "civil_registry_certificates_vitalRecordId_fkey";
ALTER TABLE "civil_registry_certificates"
  ADD CONSTRAINT "civil_registry_certificates_vitalRecordId_fkey"
  FOREIGN KEY ("vitalRecordId") REFERENCES "civil_registry_vital_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_certificates" DROP CONSTRAINT IF EXISTS "civil_registry_certificates_registryVersionId_fkey";
ALTER TABLE "civil_registry_certificates"
  ADD CONSTRAINT "civil_registry_certificates_registryVersionId_fkey"
  FOREIGN KEY ("registryVersionId") REFERENCES "civil_registry_vital_record_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_certificate_verifications" DROP CONSTRAINT IF EXISTS "civil_registry_certificate_verifications_certificateId_fkey";
ALTER TABLE "civil_registry_certificate_verifications"
  ADD CONSTRAINT "civil_registry_certificate_verifications_certificateId_fkey"
  FOREIGN KEY ("certificateId") REFERENCES "civil_registry_certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
