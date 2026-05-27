import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Order matters: delete dependents before parents
  await prisma.connection.deleteMany();
  await prisma.application.deleteMany();
  await prisma.licenseAssignment.deleteMany();
  await prisma.license.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.psu.deleteMany();
  await prisma.portGroup.deleteMany();
  await prisma.outletGroup.deleteMany();
  await prisma.battery.deleteMany();
  await prisma.drive.deleteMany();
  await prisma.component.deleteMany();
  await prisma.bayZone.deleteMany();
  await prisma.assetImage.deleteMany();
  await prisma.pciSlot.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.storage.deleteMany({ where: { name: { not: "Storage" } } });
  // Remove extra racks (keep "Main Rack" from the base seed)
  await prisma.rack.deleteMany({ where: { name: { not: "Main Rack" } } });
  console.log("Dev data cleared. Run npm run db:dev-seed to re-populate.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
