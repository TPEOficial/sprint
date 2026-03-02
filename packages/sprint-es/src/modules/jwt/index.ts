import crypto from "crypto";
import { base64UrlEncode, base64UrlDecode, decodeBase64Url } from "../utils";

const ALGORITHM = "ES256";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

// ─── Base64url helpers ───────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JWTPayload {
    [key: string]: any;
}

export interface JWTOptions {
    expiresIn?: string | number;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
}

export interface KeyPair {
    publicKey: string;
    privateKey: string;
}

// ─── Key generation ──────────────────────────────────────────────────────────

export function generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });
    return { publicKey, privateKey };
};

// ─── Expiry parser ───────────────────────────────────────────────────────────

function parseExpiry(expiresIn: string | number): number {
    if (typeof expiresIn === "number") return expiresIn;
    const units: Record<string, number> = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
        w: 604800
    };
    const match = expiresIn.match(/^(\d+)([smhdw])$/);
    if (!match) throw new Error(`Invalid expiresIn format: "${expiresIn}". Use e.g. "15m", "2h", "7d".`);
    return parseInt(match[1]) * units[match[2]];
};

// ─── Claims builder ──────────────────────────────────────────────────────────

function buildClaims(payload: JWTPayload, options: JWTOptions): JWTPayload {
    const now = Math.floor(Date.now() / 1000);
    const claims: JWTPayload = { ...payload, iat: now };
    if (options.expiresIn !== undefined) claims.exp = now + parseExpiry(options.expiresIn);
    if (options.issuer) claims.iss = options.issuer;
    if (options.subject) claims.sub = options.subject;
    if (options.audience) claims.aud = options.audience;
    return claims;
};

// ─── Payload encryption (AES-256-GCM) ────────────────────────────────────────
// Format: base64url( iv[12] || authTag[16] || ciphertext )

function encryptPayload(plaintext: string, secret: string): string {
    const key = crypto.scryptSync(secret, "sprint-jwt-salt", 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return base64UrlEncode(Buffer.concat([iv, tag, encrypted]));
};

function decryptPayload(data: string, secret: string): string {
    const key = crypto.scryptSync(secret, "sprint-jwt-salt", 32);
    const buf = base64UrlDecode(data);
    if (buf.length < 28) throw new Error("Invalid encrypted payload.");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
};

// ─── Core sign / verify ──────────────────────────────────────────────────────

export function sign(payload: JWTPayload, privateKey: string, options: JWTOptions = {}): string {
    const header = { alg: ALGORITHM, typ: "JWT" };
    const claims = buildClaims(payload, options);

    const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
    const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(claims)));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign("SHA256");
    signer.update(signingInput);
    const signature = signer.sign(privateKey);

    return `${signingInput}.${base64UrlEncode(signature)}`;
};

export function verify(token: string, publicKey: string): JWTPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, encodedSignature] = parts;

        const verifier = crypto.createVerify("SHA256");
        verifier.update(`${encodedHeader}.${encodedPayload}`);
        const isValid = verifier.verify(publicKey, base64UrlDecode(encodedSignature));
        if (!isValid) return null;

        const payload: JWTPayload = JSON.parse(decodeBase64Url(encodedPayload));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp !== undefined && payload.exp < now) return null;

        return payload;
    } catch {
        return null;
    }
};

// ─── Encrypted sign / verify (JWE-like) ─────────────────────────────────────
// The payload is AES-256-GCM encrypted before being embedded in the JWT.
// Only someone with both the public key AND the encryption secret can read it.

export function signEncrypted(payload: JWTPayload, privateKey: string, encryptionSecret: string, options: JWTOptions = {}): string {
    const encrypted = encryptPayload(JSON.stringify(payload), encryptionSecret);
    return `sprx_${sign({ enc: encrypted }, privateKey, options).slice(2)}`;
};

export function verifyEncrypted(token: string, publicKey: string, encryptionSecret: string): JWTPayload | null {
    if (!token.startsWith("sprx_")) return null;
    const verified = verify(`ey${token.slice(5)}`, publicKey);
    
    if (!verified?.enc || typeof verified.enc !== "string") return null;
    try {
        return JSON.parse(decryptPayload(verified.enc, encryptionSecret));
    } catch {
        return null;
    }
};

// ─── Token pairs ─────────────────────────────────────────────────────────────

export function createTokenPair(
    payload: JWTPayload,
    privateKey: string,
    options: JWTOptions = {}
): { accessToken: string; refreshToken: string } {
    const accessToken = sign(payload, privateKey, options);
    const refreshToken = sign(
        { sub: payload.sub ?? payload.id, type: "refresh" },
        privateKey,
        { expiresIn: "7d", issuer: options.issuer }
    );
    return { accessToken, refreshToken };
}

export function verifyTokenPair(
    accessToken: string,
    refreshToken: string,
    publicKey: string
): { accessToken: JWTPayload | null; refreshToken: JWTPayload | null } {
    return {
        accessToken: verify(accessToken, publicKey),
        refreshToken: verify(refreshToken, publicKey)
    };
};

// ─── Env helpers ─────────────────────────────────────────────────────────────
let publicKey = process.env.JWT_PUBLIC_KEY;
let privateKey = process.env.JWT_PRIVATE_KEY;
let encryptionSecret = process.env.JWT_ENCRYPTION_SECRET;

export function getJwtFromEnv(): { publicKey: string; privateKey: string; encryptionSecret: string } {
    if (!publicKey || !privateKey || !encryptionSecret) throw new Error("JWT keys not configured. Run 'npm run generate:keys' and add the keys to your .env file.");

    const normalize = (k: string) => k.replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");
    return { publicKey: normalize(publicKey), privateKey: normalize(privateKey), encryptionSecret };
};