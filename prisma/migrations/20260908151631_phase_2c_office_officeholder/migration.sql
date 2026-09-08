-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officeholders" (
    "id" UUID NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "titlePrefix" TEXT,
    "titleSuffix" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officeholders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_institutionId_code_key" ON "departments"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "offices_departmentId_code_key" ON "offices"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "officeholders_referenceCode_key" ON "officeholders"("referenceCode");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
