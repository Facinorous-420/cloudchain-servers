// Shared PCIe / M.2 slot + card size catalogue. Used by the asset form's PCIe
// slot editor, the component form, and the asset server action so slot/card
// compatibility is decided in exactly one place.
//
// Two families:
//  - PCIE: lane-based slots (x1/x4/x8/x16, OCP). A card fits a slot when it
//    needs the same-or-fewer lanes (an x8 card fits an x16 slot).
//  - M2:   length-based M.2 slots (2230..22110). A shorter module fits a longer
//    slot (an M.2 2242 card fits an M.2 2280 slot).
// Cross-family never fits (an x8 card can't go in an M.2 slot, and vice-versa).

export type PciSlotFamily = "PCIE" | "M2";

export type PciSize = {
  value: string;
  label: string;
  family: PciSlotFamily;
  rank: number; // lanes for PCIE, module length for M2 — higher = larger
};

export const PCI_SIZES: PciSize[] = [
  { value: "x1", label: "PCIe x1", family: "PCIE", rank: 1 },
  { value: "x4", label: "PCIe x4", family: "PCIE", rank: 4 },
  { value: "x8", label: "PCIe x8", family: "PCIE", rank: 8 },
  { value: "x16", label: "PCIe x16", family: "PCIE", rank: 16 },
  { value: "OCP 3.0", label: "OCP 3.0", family: "PCIE", rank: 16 },
  { value: "M.2 2230", label: "M.2 2230", family: "M2", rank: 30 },
  { value: "M.2 2242", label: "M.2 2242", family: "M2", rank: 42 },
  { value: "M.2 2260", label: "M.2 2260", family: "M2", rank: 60 },
  { value: "M.2 2280", label: "M.2 2280", family: "M2", rank: 80 },
  { value: "M.2 22110", label: "M.2 22110", family: "M2", rank: 110 },
];

export const PCI_SIZE_VALUES = PCI_SIZES.map((s) => s.value);

export function pciSizeByValue(value: string): PciSize | undefined {
  return PCI_SIZES.find((s) => s.value === value);
}

export function slotFamily(slotSize: string): PciSlotFamily | null {
  return pciSizeByValue(slotSize)?.family ?? null;
}

// Card sizes that physically fit the given slot (same family, rank ≤ slot rank).
export function compatibleCardSizes(slotSize: string): string[] {
  const slot = pciSizeByValue(slotSize);
  if (!slot) return PCI_SIZE_VALUES; // unknown slot — don't constrain
  return PCI_SIZES.filter(
    (c) => c.family === slot.family && c.rank <= slot.rank,
  ).map((c) => c.value);
}

// Does a card of `cardSize` fit `slotSize`? A null/unknown card size is treated
// as a generic PCIe card: it fits any PCIE slot but not an M.2 slot.
export function cardFitsSlot(
  cardSize: string | null | undefined,
  slotSize: string,
): boolean {
  const slot = pciSizeByValue(slotSize);
  if (!slot) return true; // unknown slot — allow
  if (!cardSize) return slot.family === "PCIE";
  const card = pciSizeByValue(cardSize);
  if (!card) return slot.family === "PCIE";
  return card.family === slot.family && card.rank <= slot.rank;
}

// Which component types can occupy a slot of this family.
const PCIE_TYPES = [
  "NIC_CARD",
  "GPU",
  "PCIE_CARD",
  "RAID_CONTROLLER",
  "NVME_RISER",
] as const;
const M2_TYPES = ["NIC_CARD", "PCIE_CARD"] as const;

export function allowedCardTypes(slotSize: string): string[] {
  return slotFamily(slotSize) === "M2" ? [...M2_TYPES] : [...PCIE_TYPES];
}
