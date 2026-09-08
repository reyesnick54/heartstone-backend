-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('PERMANENT', 'FIXED_TERM', 'ACTING', 'INTERIM', 'TEMPORARY', 'EX_OFFICIO', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'SUSPENDED', 'ENDED', 'REVOKED');

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officeholders" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "officeholderId" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "appointmentType" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "instrumentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offices_referenceCode_key" ON "offices"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "officeholders_referenceCode_key" ON "officeholders"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_referenceCode_key" ON "appointments"("referenceCode");

-- CreateIndex
CREATE INDEX "appointments_officeId_idx" ON "appointments"("officeId");

-- CreateIndex
CREATE INDEX "appointments_officeholderId_idx" ON "appointments"("officeholderId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_appointmentType_idx" ON "appointments"("appointmentType");

-- CreateIndex
CREATE INDEX "appointments_effectiveFrom_idx" ON "appointments"("effectiveFrom");

-- CreateIndex
CREATE INDEX "appointments_effectiveUntil_idx" ON "appointments"("effectiveUntil");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
