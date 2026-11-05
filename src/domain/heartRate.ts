/**
 * Parses the Bluetooth SIG Heart Rate Measurement characteristic (0x2A37).
 * Bit 0 of the flags byte says whether the value is 8-bit or 16-bit.
 */
export function parseHeartRate(view: DataView): number {
  const flags = view.getUint8(0);
  return flags & 0x01 ? view.getUint16(1, true) : view.getUint8(1);
}
