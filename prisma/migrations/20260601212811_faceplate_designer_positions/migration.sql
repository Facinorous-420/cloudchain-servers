-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "builtInFace" "FaceSide",
ADD COLUMN     "builtInGridCol" INTEGER,
ADD COLUMN     "builtInGridRow" INTEGER;

-- AlterTable
ALTER TABLE "BayZone" ADD COLUMN     "gridCol" INTEGER,
ADD COLUMN     "gridRow" INTEGER;
