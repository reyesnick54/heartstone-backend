-- Citizen self-service requests (additive only).
--
-- record_corrections.proposedChanges: replacement values a requester proposes for a record
--   (e.g. a citizen's profile name). A proposal only: the target record is not changed until
--   an authorized official approves and implements the correction.
-- record_corrections.idempotencyKey: client retry key, unique per requester (NULLs allowed).
-- decision_review_references.groundsStatement: the appellant's grounds for review as filed.

-- AlterTable
ALTER TABLE "record_corrections" ADD COLUMN "proposedChanges" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "record_corrections" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "record_corrections_requestedBy_idempotencyKey_key" ON "record_corrections"("requestedBy", "idempotencyKey");

-- AlterTable
ALTER TABLE "decision_review_references" ADD COLUMN "groundsStatement" TEXT;
