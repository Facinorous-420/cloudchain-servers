-- CreateEnum
CREATE TYPE "AnnotationKind" AS ENUM ('TEXT', 'SPACER');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "rackRenderFrontPath" TEXT,
ADD COLUMN     "rackRenderRearPath" TEXT;

-- AlterTable
ALTER TABLE "OutletGroup" ADD COLUMN     "columns" INTEGER,
ADD COLUMN     "face" "FaceSide",
ADD COLUMN     "gridCol" INTEGER,
ADD COLUMN     "gridRow" INTEGER,
ADD COLUMN     "hiddenPorts" JSONB,
ADD COLUMN     "rows" INTEGER;

-- AlterTable
ALTER TABLE "PortGroup" ADD COLUMN     "columns" INTEGER,
ADD COLUMN     "face" "FaceSide",
ADD COLUMN     "gridCol" INTEGER,
ADD COLUMN     "gridRow" INTEGER,
ADD COLUMN     "hiddenPorts" JSONB,
ADD COLUMN     "rows" INTEGER;

-- AlterTable
ALTER TABLE "Psu" ADD COLUMN     "face" "FaceSide",
ADD COLUMN     "gridCol" INTEGER,
ADD COLUMN     "gridRow" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "diagramPrefs" JSONB;

-- CreateTable
CREATE TABLE "FaceplateAnnotation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "face" "FaceSide" NOT NULL DEFAULT 'FRONT',
    "kind" "AnnotationKind" NOT NULL,
    "text" TEXT,
    "gridRow" INTEGER,
    "gridCol" INTEGER,
    "rowSpan" INTEGER NOT NULL DEFAULT 1,
    "colSpan" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaceplateAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceplateAnnotation_assetId_idx" ON "FaceplateAnnotation"("assetId");

-- AddForeignKey
ALTER TABLE "FaceplateAnnotation" ADD CONSTRAINT "FaceplateAnnotation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
