// Canonical connection-endpoint label builders.
//
// Some endpoints (built-in NICs, PSUs, KVM channels, PCIe NIC card ports) have
// no structured foreign-key reference on the Connection row — they are addressed
// by a label string instead. For PCIe NIC cards this is fragile: two cards in
// the same host can share a `name`, so a label built from the name alone
// collides. Encoding the card's slot (unique per host) disambiguates them.
//
// Every producer (the connection form) and every reader (the topology inspector)
// must import these helpers so the label format can never drift between them.

// Label for one port on a NIC/RAID card installed in a PCIe slot.
// `slotSortOrder` is 0-based; shown 1-based to match the slot UI.
export function pciNicPortLabel(
  componentName: string,
  slotSortOrder: number,
  portNumber: number,
): string {
  return `${componentName} [slot ${slotSortOrder + 1}] Port ${portNumber}`;
}

// The fixed prefix for a card's ports, used to test whether a stored label
// belongs to this card (and to parse the port number back out).
export function pciNicPortPrefix(
  componentName: string,
  slotSortOrder: number,
): string {
  return `${componentName} [slot ${slotSortOrder + 1}] Port `;
}
