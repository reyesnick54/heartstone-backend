-- S13: cryptographic evidence and malware scan metadata on document versions
ALTER TABLE "document_versions"
ADD COLUMN "malwareScanEngineId" TEXT,
ADD COLUMN "malwareScanEngineVersion" TEXT,
ADD COLUMN "malwareScanResultSummary" TEXT,
ADD COLUMN "signatureEvidence" JSONB,
ADD COLUMN "sealEvidence" JSONB;
