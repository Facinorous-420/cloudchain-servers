-- AlterEnum
ALTER TYPE "AnnotationKind" ADD VALUE 'DIVIDER';

-- AlterTable
ALTER TABLE "BayZone" ADD COLUMN     "columns" INTEGER,
ADD COLUMN     "rows" INTEGER;
