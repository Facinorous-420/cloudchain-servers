-- Cloudchain Inventory v1.0.0 — initial schema
-- Creates the entire database schema from scratch on a fresh PostgreSQL database.

CREATE SCHEMA IF NOT EXISTS "public";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

CREATE TYPE "LifecycleState" AS ENUM ('IN_USE', 'STORED', 'SOLD', 'JUNKED', 'USED_UP');

CREATE TYPE "AssetCategory" AS ENUM (
    'SERVER', 'SWITCH', 'GATEWAY', 'FIREWALL', 'UPS', 'PDU', 'KVM',
    'ACCESS_POINT', 'NUC', 'SBC', 'SHELF', 'DRAWER', 'BLANK_PANEL', 'OTHER',
    'PATCH_PANEL'
);

CREATE TYPE "FormFactor"    AS ENUM ('RACK', 'TOWER', 'SHELF_ITEM', 'NON_RACK');
CREATE TYPE "AssetLocation" AS ENUM ('RACKED', 'STORAGE', 'ON_SHELF', 'RETIRED', 'OFFSITE');
CREATE TYPE "FaceSide"      AS ENUM ('FRONT', 'REAR', 'INTERIOR');
CREATE TYPE "DriveSize"     AS ENUM ('LFF', 'SFF', 'M2');
CREATE TYPE "DriveKind"     AS ENUM ('HDD', 'SSD', 'SAS', 'NVME');
CREATE TYPE "RackFace"      AS ENUM ('FRONT', 'REAR');

CREATE TYPE "ComponentType" AS ENUM (
    'RAM', 'CADDY', 'RAID_CONTROLLER', 'RAIL_KIT', 'PCIE_CARD', 'NIC_CARD',
    'GPU', 'CPU', 'POWER_SUPPLY', 'BLANKING_PANEL', 'ADAPTER', 'NVME_RISER', 'OTHER'
);

CREATE TYPE "DeviceSide"      AS ENUM ('LEFT', 'CENTER', 'RIGHT');
CREATE TYPE "FaceOrientation" AS ENUM ('FRONT_FRONT', 'FRONT_REAR');

CREATE TYPE "PortType" AS ENUM (
    'ETHERNET', 'FAST_ETHERNET', 'IPMI', 'SFP', 'SFP_PLUS', 'SFP28',
    'QSFP', 'QSFP_PLUS', 'QSFP28', 'CONSOLE', 'USB'
);

CREATE TYPE "RenewalPeriod" AS ENUM (
    'DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'BI_ANNUAL',
    'ANNUAL', 'TWO_YEARS', 'FIVE_YEARS', 'TEN_YEARS', 'PERPETUAL'
);

CREATE TYPE "AppType"        AS ENUM ('VM', 'CONTAINER', 'SERVICE');
CREATE TYPE "ConnectionType" AS ENUM ('NETWORK', 'POWER', 'KVM', 'CONSOLE');

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE "User" (
    "id"             TEXT         NOT NULL,
    "username"       TEXT         NOT NULL,
    "passwordHash"   TEXT         NOT NULL,
    "displayName"    TEXT,
    "role"           "Role"       NOT NULL DEFAULT 'MEMBER',
    "isInitialAdmin" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rack" (
    "id"               TEXT         NOT NULL,
    "name"             TEXT         NOT NULL,
    "totalU"           INTEGER      NOT NULL DEFAULT 25,
    "columnCount"      INTEGER      NOT NULL DEFAULT 6,
    "depthInches"      DOUBLE PRECISION,
    "manufacturer"     TEXT,
    "modelNumber"      TEXT,
    "serialNumber"     TEXT,
    "condition"        TEXT,
    "purchaseDate"     TIMESTAMP(3),
    "purchasePrice"    DECIMAL(10,2),
    "purchasedFrom"    TEXT,
    "purchasedFromUrl" TEXT,
    "inUse"            BOOLEAN      NOT NULL DEFAULT true,
    "isDefault"        BOOLEAN      NOT NULL DEFAULT false,
    "isLocked"         BOOLEAN      NOT NULL DEFAULT false,
    "notes"            TEXT,
    "imagePath"        TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Storage" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "notes"     TEXT,
    "imagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Storage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id"                          TEXT               NOT NULL,
    "codename"                    TEXT               NOT NULL,
    "name"                        TEXT               NOT NULL,
    "category"                    "AssetCategory"    NOT NULL,
    "manufacturer"                TEXT,
    "modelNumber"                 TEXT,
    "serialNumber"                TEXT,
    "condition"                   TEXT,
    "purchaseDate"                TIMESTAMP(3),
    "purchasePrice"               DECIMAL(10,2),
    "purchasePriceBeforeShip"     DECIMAL(10,2),
    "purchasedFrom"               TEXT,
    "purchasedFromUrl"            TEXT,
    "state"                       "LifecycleState"   NOT NULL DEFAULT 'IN_USE',
    "soldDate"                    TIMESTAMP(3),
    "soldPrice"                   DECIMAL(10,2),
    "notes"                       TEXT,
    "imagePath"                   TEXT,
    "maxPowerDrawWatts"           INTEGER,
    "idlePowerWatts"              INTEGER,
    "warrantyEndDate"             TIMESTAMP(3),
    "firmwareVersion"             TEXT,
    "formFactor"                  "FormFactor"       NOT NULL DEFAULT 'RACK',
    "heightInches"                DOUBLE PRECISION,
    "widthInches"                 DOUBLE PRECISION,
    "depthInches"                 DOUBLE PRECISION,
    "rackUnits"                   INTEGER,
    "requiresSupport"             BOOLEAN            NOT NULL DEFAULT false,
    "location"                    "AssetLocation"    NOT NULL DEFAULT 'STORAGE',
    "storageId"                   TEXT,
    "rackId"                      TEXT,
    "startU"                      INTEGER,
    "gridColumn"                  INTEGER,
    "columnSpan"                  INTEGER,
    "parentAssetId"               TEXT,
    "builtInEthernetCount"        INTEGER,
    "builtInSfpCount"             INTEGER,
    "surgeProtectedEthernetCount" INTEGER,
    "kvmChannelCount"             INTEGER,
    "psuCount"                    INTEGER,
    "chassis"                     TEXT,
    "mainboard"                   TEXT,
    "raidController"              TEXT,
    "operatingSystem"             TEXT,
    "biosVersion"                 TEXT,
    "extras"                      TEXT,
    "managementType"              TEXT,
    "poeBudgetWatts"              INTEGER,
    "throughputGbps"              DOUBLE PRECISION,
    "maxConcurrentConnections"    INTEGER,
    "vaRating"                    INTEGER,
    "wattsRating"                 INTEGER,
    "estimatedRuntimeMinutes"     INTEGER,
    "amperage"                    TEXT,
    "pduType"                     TEXT,
    "supportedProtocols"          TEXT,
    "wifiStandard"                TEXT,
    "maxThroughputMbps"           INTEGER,
    "bandSupport"                 TEXT,
    "bandsLegacyText"             TEXT,
    "poeInputType"                TEXT,
    "placement"                   TEXT,
    "maxLoadLbs"                  DOUBLE PRECISION,
    "ventilated"                  BOOLEAN,
    "drawerType"                  TEXT,
    "pulloutDepthInches"          DOUBLE PRECISION,
    "purpose"                     TEXT,
    "builtInPortsSide"            "DeviceSide",
    "faceOrientation"             "FaceOrientation"  NOT NULL DEFAULT 'FRONT_FRONT',
    "rackFace"                    "RackFace",
    "patchPanelType"              TEXT,
    "createdAt"                   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3)       NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BayZone" (
    "id"          TEXT        NOT NULL,
    "assetId"     TEXT,
    "componentId" TEXT,
    "name"        TEXT        NOT NULL,
    "faceSide"    "FaceSide"  NOT NULL DEFAULT 'FRONT',
    "driveSize"   "DriveSize" NOT NULL,
    "bayCount"    INTEGER     NOT NULL,
    "sortOrder"   INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT "BayZone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Drive" (
    "id"               TEXT             NOT NULL,
    "name"             TEXT             NOT NULL,
    "manufacturer"     TEXT,
    "model"            TEXT,
    "kind"             "DriveKind"      NOT NULL,
    "size"             "DriveSize"      NOT NULL,
    "capacityGB"       INTEGER          NOT NULL,
    "serialNumber"     TEXT,
    "manufactureDate"  TIMESTAMP(3),
    "purchaseDate"     TIMESTAMP(3),
    "purchasePrice"    DECIMAL(10,2),
    "purchasedFrom"    TEXT,
    "purchasedFromUrl" TEXT,
    "condition"        TEXT,
    "assignedUse"      TEXT,
    "state"            "LifecycleState" NOT NULL DEFAULT 'IN_USE',
    "soldDate"         TIMESTAMP(3),
    "soldPrice"        DECIMAL(10,2),
    "notes"            TEXT,
    "imagePath"        TEXT,
    "installedInId"    TEXT,
    "bayZoneId"        TEXT,
    "bayNumber"        INTEGER,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Drive_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Component" (
    "id"              TEXT             NOT NULL,
    "name"            TEXT             NOT NULL,
    "type"            "ComponentType"  NOT NULL,
    "manufacturer"    TEXT,
    "model"           TEXT,
    "specs"           TEXT,
    "serialNumber"    TEXT,
    "quantity"        INTEGER          NOT NULL DEFAULT 1,
    "purchaseDate"    TIMESTAMP(3),
    "purchasePrice"   DECIMAL(10,2),
    "purchasedFrom"   TEXT,
    "purchasedFromUrl" TEXT,
    "notes"           TEXT,
    "imagePath"       TEXT,
    "installedInId"   TEXT,
    "speedGHz"        DOUBLE PRECISION,
    "cores"           INTEGER,
    "threads"         INTEGER,
    "socket"          TEXT,
    "tdpWatts"        INTEGER,
    "capacityGB"      INTEGER,
    "speedMHz"        INTEGER,
    "generation"      TEXT,
    "ecc"             BOOLEAN,
    "formFactor"      TEXT,
    "portCount"       INTEGER,
    "portType"        "PortType",
    "portSpeed"       TEXT,
    "cardInterface"   TEXT,
    "wattsRating"     INTEGER,
    "modular"         BOOLEAN,
    "m2SlotCount"     INTEGER,
    "state"           "LifecycleState" NOT NULL DEFAULT 'IN_USE',
    "soldDate"        TIMESTAMP(3),
    "soldPrice"       DECIMAL(10,2),
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortGroup" (
    "id"         TEXT         NOT NULL,
    "assetId"    TEXT         NOT NULL,
    "name"       TEXT,
    "portCount"  INTEGER      NOT NULL,
    "portType"   "PortType"   NOT NULL,
    "portSpeed"  TEXT,
    "poePerPort" INTEGER,
    "side"       "DeviceSide" NOT NULL DEFAULT 'LEFT',
    "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT "PortGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutletGroup" (
    "id"             TEXT         NOT NULL,
    "assetId"        TEXT         NOT NULL,
    "name"           TEXT,
    "outletCount"    INTEGER      NOT NULL,
    "outletType"     TEXT,
    "batteryBacked"  BOOLEAN      NOT NULL DEFAULT false,
    "surgeProtected" BOOLEAN      NOT NULL DEFAULT true,
    "side"           "DeviceSide" NOT NULL DEFAULT 'LEFT',
    "sortOrder"      INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT "OutletGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Battery" (
    "id"               TEXT             NOT NULL,
    "name"             TEXT             NOT NULL,
    "manufacturer"     TEXT,
    "model"            TEXT,
    "voltage"          DOUBLE PRECISION,
    "capacityAh"       DOUBLE PRECISION,
    "quantity"         INTEGER          NOT NULL DEFAULT 1,
    "installDate"      TIMESTAMP(3),
    "purchaseDate"     TIMESTAMP(3),
    "purchasePrice"    DECIMAL(10,2),
    "purchasedFrom"    TEXT,
    "purchasedFromUrl" TEXT,
    "state"            "LifecycleState" NOT NULL DEFAULT 'IN_USE',
    "soldDate"         TIMESTAMP(3),
    "soldPrice"        DECIMAL(10,2),
    "notes"            TEXT,
    "imagePath"        TEXT,
    "installedInId"    TEXT,
    "storageId"        TEXT,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Battery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Consumable" (
    "id"               TEXT             NOT NULL,
    "name"             TEXT             NOT NULL,
    "type"             TEXT,
    "quantity"         INTEGER          NOT NULL DEFAULT 1,
    "location"         TEXT,
    "purchaseDate"     TIMESTAMP(3),
    "purchasePrice"    DECIMAL(10,2),
    "purchasedFrom"    TEXT,
    "purchasedFromUrl" TEXT,
    "state"            "LifecycleState" NOT NULL DEFAULT 'IN_USE',
    "notes"            TEXT,
    "imagePath"        TEXT,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Consumable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "License" (
    "id"               TEXT             NOT NULL,
    "name"             TEXT             NOT NULL,
    "type"             TEXT,
    "licenseKey"       TEXT,
    "seats"            INTEGER,
    "renewalPeriod"    "RenewalPeriod",
    "renewalDate"      TIMESTAMP(3),
    "purchaseDate"     TIMESTAMP(3),
    "cost"             DECIMAL(10,2),
    "purchasedFrom"    TEXT,
    "purchasedFromUrl" TEXT,
    "notes"            TEXT,
    "imagePath"        TEXT,
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseAssignment" (
    "id"        TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "assetId"   TEXT NOT NULL,
    CONSTRAINT "LicenseAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
    "id"              TEXT         NOT NULL,
    "name"            TEXT         NOT NULL,
    "type"            "AppType"    NOT NULL DEFAULT 'SERVICE',
    "hostId"          TEXT         NOT NULL,
    "operatingSystem" TEXT,
    "status"          TEXT,
    "notes"           TEXT,
    "imagePath"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Connection" (
    "id"                       TEXT              NOT NULL,
    "type"                     "ConnectionType"  NOT NULL,
    "aEndAssetId"              TEXT              NOT NULL,
    "aEndLabel"                TEXT              NOT NULL,
    "bEndAssetId"              TEXT,
    "bEndLabel"                TEXT,
    "aEndPortGroupId"          TEXT,
    "aEndPortNumber"           INTEGER,
    "bEndPortGroupId"          TEXT,
    "bEndPortNumber"           INTEGER,
    "aEndOutletGroupId"        TEXT,
    "aEndOutletNumber"         INTEGER,
    "bEndOutletGroupId"        TEXT,
    "bEndOutletNumber"         INTEGER,
    "cableType"                TEXT,
    "cableCategory"            TEXT,
    "isPatch"                  BOOLEAN          NOT NULL DEFAULT false,
    "speed"                    TEXT,
    "cableLengthFeet"          INTEGER,
    "estimatedCableLengthFeet" INTEGER,
    "serviceLoopLengthInches"  INTEGER,
    "notes"                    TEXT,
    "createdAt"                TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Psu" (
    "id"            TEXT             NOT NULL,
    "assetId"       TEXT             NOT NULL,
    "sortOrder"     INTEGER          NOT NULL DEFAULT 0,
    "side"          "DeviceSide"     NOT NULL DEFAULT 'LEFT',
    "wattage"       INTEGER,
    "portCount"     INTEGER          NOT NULL DEFAULT 1,
    "state"         "LifecycleState" NOT NULL DEFAULT 'IN_USE',
    "manufacturer"  TEXT,
    "model"         TEXT,
    "serialNumber"  TEXT,
    "purchaseDate"  TIMESTAMP(3),
    "purchasePrice" DECIMAL(10,2),
    "purchasedFrom" TEXT,
    "soldDate"      TIMESTAMP(3),
    "soldPrice"     DECIMAL(10,2),
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "Psu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetImage" (
    "id"        TEXT    NOT NULL,
    "assetId"   TEXT    NOT NULL,
    "path"      TEXT    NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMain"    BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AssetImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PciSlot" (
    "id"                    TEXT    NOT NULL,
    "assetId"               TEXT    NOT NULL,
    "sortOrder"             INTEGER NOT NULL DEFAULT 0,
    "size"                  TEXT    NOT NULL,
    "occupiedByComponentId" TEXT,
    CONSTRAINT "PciSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSettings" (
    "id"                      INTEGER NOT NULL DEFAULT 1,
    "appName"                 TEXT    NOT NULL DEFAULT 'Cloudchain Inventory',
    "appDescription"          TEXT    NOT NULL DEFAULT 'Homelab server rack inventory and documentation',
    "accentColor"             TEXT    NOT NULL DEFAULT '#00a8c6',
    "serviceLoopLengthInches" INTEGER NOT NULL DEFAULT 12,
    "portTypeColors"          JSONB,
    "portTypeLabels"          JSONB,
    "categoryColors"          JSONB,
    CONSTRAINT "AppSettings_pkey"      PRIMARY KEY ("id"),
    CONSTRAINT "AppSettings_singleton" CHECK ("id" = 1)
);

-- ─── Unique indexes ───────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "User_username_key"                        ON "User"("username");
CREATE UNIQUE INDEX "Storage_name_key"                         ON "Storage"("name");
CREATE UNIQUE INDEX "Asset_codename_key"                       ON "Asset"("codename");
CREATE UNIQUE INDEX "LicenseAssignment_licenseId_assetId_key"  ON "LicenseAssignment"("licenseId", "assetId");

-- AssetImage: at most one isMain=true row per asset
CREATE        INDEX "AssetImage_assetId_idx"       ON "AssetImage"("assetId");
CREATE UNIQUE INDEX "AssetImage_assetId_isMain_key" ON "AssetImage"("assetId") WHERE "isMain" = true;

-- PciSlot: a component can occupy at most one slot
CREATE UNIQUE INDEX "PciSlot_occupiedByComponentId_key"
    ON "PciSlot"("occupiedByComponentId") WHERE "occupiedByComponentId" IS NOT NULL;

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_storageId_fkey"
    FOREIGN KEY ("storageId") REFERENCES "Storage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_rackId_fkey"
    FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentAssetId_fkey"
    FOREIGN KEY ("parentAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BayZone" ADD CONSTRAINT "BayZone_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BayZone" ADD CONSTRAINT "BayZone_componentId_fkey"
    FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Drive" ADD CONSTRAINT "Drive_installedInId_fkey"
    FOREIGN KEY ("installedInId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Drive" ADD CONSTRAINT "Drive_bayZoneId_fkey"
    FOREIGN KEY ("bayZoneId") REFERENCES "BayZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Component" ADD CONSTRAINT "Component_installedInId_fkey"
    FOREIGN KEY ("installedInId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PortGroup" ADD CONSTRAINT "PortGroup_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutletGroup" ADD CONSTRAINT "OutletGroup_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Battery" ADD CONSTRAINT "Battery_installedInId_fkey"
    FOREIGN KEY ("installedInId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Battery" ADD CONSTRAINT "Battery_storageId_fkey"
    FOREIGN KEY ("storageId") REFERENCES "Storage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_licenseId_fkey"
    FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application" ADD CONSTRAINT "Application_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Connection" ADD CONSTRAINT "Connection_aEndAssetId_fkey"
    FOREIGN KEY ("aEndAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_bEndAssetId_fkey"
    FOREIGN KEY ("bEndAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_aEndPortGroupId_fkey"
    FOREIGN KEY ("aEndPortGroupId") REFERENCES "PortGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_bEndPortGroupId_fkey"
    FOREIGN KEY ("bEndPortGroupId") REFERENCES "PortGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_aEndOutletGroupId_fkey"
    FOREIGN KEY ("aEndOutletGroupId") REFERENCES "OutletGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_bEndOutletGroupId_fkey"
    FOREIGN KEY ("bEndOutletGroupId") REFERENCES "OutletGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Psu" ADD CONSTRAINT "Psu_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetImage" ADD CONSTRAINT "AssetImage_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PciSlot" ADD CONSTRAINT "PciSlot_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PciSlot" ADD CONSTRAINT "PciSlot_occupiedByComponentId_fkey"
    FOREIGN KEY ("occupiedByComponentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Seed default settings row ───────────────────────────────────────────────

INSERT INTO "AppSettings" ("id", "appName", "appDescription", "accentColor", "serviceLoopLengthInches")
VALUES (1, 'Cloudchain Inventory', 'Homelab server rack inventory and documentation', '#00a8c6', 12)
ON CONFLICT ("id") DO NOTHING;
