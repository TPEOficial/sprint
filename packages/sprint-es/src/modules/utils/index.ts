// ─── Base64url helpers ───────────────────────────────────────────────────────
export const base64UrlEncode = (buffer: Buffer): string => buffer.toString("base64url");
export const base64UrlDecode = (str: string): Buffer => Buffer.from(str, "base64url");
export const decodeBase64Url = (str: string): string => Buffer.from(str, "base64url").toString("utf8");