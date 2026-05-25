import * as Crypto from "expo-crypto";

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function uuidv7() {
  const timestamp = Date.now();
  const bytes = await Crypto.getRandomBytesAsync(10);
  const timeHex = timestamp.toString(16).padStart(12, "0").slice(-12);
  const randA = (((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0)) & 0x0fff;
  const randAHex = (0x7000 | randA).toString(16);
  const variantByte = ((bytes[2] ?? 0) & 0x3f) | 0x80;
  const tail = hex(Uint8Array.from([variantByte, ...bytes.slice(3)]));

  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${randAHex}-${tail.slice(0, 4)}-${tail.slice(4, 16)}`;
}
