import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const PREFIX = "apc1";
const AAD = Buffer.from("agentpay-confirmation-capability:v1", "utf8");
const MAX_PLAINTEXT_BYTES = 16_384;
const MAX_CAPABILITY_LENGTH = 24_000;

function decodeCanonicalBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error("invalid base64url encoding");
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error("non-canonical base64url encoding");
  }
  return decoded;
}

function sealingKey(): Buffer {
  const configured = process.env.CONFIRMATION_SEALING_KEY;
  if (!configured || !/^(?:0x)?[0-9a-fA-F]{64}$/.test(configured)) {
    throw new Error(
      "CONFIRMATION_SEALING_KEY must be configured as 32 random bytes in hex",
    );
  }
  return Buffer.from(configured.replace(/^0x/, ""), "hex");
}

export function confirmationSealingConfigured(): boolean {
  try {
    sealingKey();
    return true;
  } catch {
    return false;
  }
}

export function isSealedConfirmationToken(value: string): boolean {
  return value.startsWith(`${PREFIX}.`);
}

export function sealConfirmationToken(rawToken: string): string {
  const plaintext = Buffer.from(rawToken, "utf8");
  if (plaintext.length === 0 || plaintext.length > MAX_PLAINTEXT_BYTES) {
    throw new Error("confirmation payload has an invalid size");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealingKey(), iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function openConfirmationToken(capability: string): string {
  if (capability.length > MAX_CAPABILITY_LENGTH) {
    throw new Error("confirmation capability is too large");
  }
  const [prefix, encodedIv, encodedCiphertext, encodedTag, extra] =
    capability.split(".");
  if (
    prefix !== PREFIX ||
    !encodedIv ||
    !encodedCiphertext ||
    !encodedTag ||
    extra !== undefined
  ) {
    throw new Error("confirmation capability is malformed");
  }

  try {
    const iv = decodeCanonicalBase64Url(encodedIv);
    const ciphertext = decodeCanonicalBase64Url(encodedCiphertext);
    const tag = decodeCanonicalBase64Url(encodedTag);
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
      throw new Error("invalid encrypted fields");
    }
    const decipher = createDecipheriv("aes-256-gcm", sealingKey(), iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    if (plaintext.length > MAX_PLAINTEXT_BYTES) {
      throw new Error("decrypted payload is too large");
    }
    return plaintext.toString("utf8");
  } catch (error) {
    if (
      (error as Error).message.startsWith("CONFIRMATION_SEALING_KEY")
    ) {
      throw error;
    }
    throw new Error(
      "confirmation capability is invalid or belongs to another AgentPay deployment",
    );
  }
}
