import crypto, { CipherGCM, DecipherGCM } from "crypto";

const ALGORITHM = "dir";
const ENC_ALGORITHM = "A256GCM";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function base64UrlEncode(buffer: Buffer): string {
    return buffer.toString("base64url");
}

function base64UrlDecodeSafe(str: string): Buffer {
    const pad = str.length % 4;
    const padded = pad ? str + "=".repeat(4 - pad) : str;
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function decodeBase64Url(str: string): string {
    return Buffer.from(str, "base64url").toString();
}

function importKey(key: string): Buffer {
    if (key.length === 32) return Buffer.from(key, "utf8");
    if (/^[A-Za-z0-9_-]+$/.test(key) && key.length >= 32) {
        const hash = crypto.createHash("sha256");
        hash.update(key);
        return hash.digest();
    }
    return Buffer.from(key, "utf8").slice(0, KEY_LENGTH);
}

export interface JWTPayload {
    [key: string]: any;
}

export interface JWTOptions {
    expiresIn?: string | number;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
}

export interface EncryptedJWTOptions {
    secret: string;
    expiresIn?: string | number;
    issuer?: string;
}

function encodeBase64Url(str: string): string {
    return Buffer.from(str).toString("base64url");
}

export function sign(payload: JWTPayload, secret: string, options: JWTOptions = {}): string {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    
    const claims: JWTPayload = { ...payload };
    if (options.expiresIn) {
        claims.exp = typeof options.expiresIn === "number" ? now + options.expiresIn : now + parseInt(options.expiresIn);
    }
    if (options.issuer) claims.iss = options.issuer;
    if (options.subject) claims.sub = options.subject;
    if (options.audience) claims.aud = options.audience;
    claims.iat = now;

    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(claims));

    const signature = crypto
        .createHmac("sha256", secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest();

    return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
}

export function verify(token: string, secret: string): JWTPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;
        const expectedSig = crypto
            .createHmac("sha256", secret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest();

        const sigBuffer = base64UrlDecodeSafe(signature);
        if (!crypto.timingSafeEqual(sigBuffer, expectedSig)) return null;

        const payload = JSON.parse(decodeBase64Url(encodedPayload));

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

        return payload;
    } catch {
        return null;
    }
}

export function encrypt(payload: JWTPayload, secret: string, options: EncryptedJWTOptions = { secret }): string {
    const now = Math.floor(Date.now() / 1000);
    const key = importKey(secret);
    
    const header = {
        alg: ALGORITHM,
        enc: ENC_ALGORITHM,
        typ: "JWT"
    };

    const claims: JWTPayload = { ...payload };
    if (options.expiresIn) {
        claims.exp = now + parseInt(String(options.expiresIn));
    }
    if (options.issuer) claims.iss = options.issuer;
    claims.iat = now;

    const iv = crypto.randomBytes(IV_LENGTH);
    const aad = Buffer.from(JSON.stringify(header));

    const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, iv) as CipherGCM;
    cipher.setAAD(aad);

    const plaintext = Buffer.from(JSON.stringify(claims));
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedIv = base64UrlEncode(iv);
    const encodedEncrypted = base64UrlEncode(encrypted);
    const encodedAuthTag = base64UrlEncode(authTag);

    return `${encodedHeader}.${encodedIv}.${encodedEncrypted}.${encodedAuthTag}`;
}

export function decrypt(token: string, secret: string): JWTPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 4) return null;

        const [encodedHeader, encodedIv, encodedEncrypted, encodedAuthTag] = parts;
        const key = importKey(secret);

        const header = JSON.parse(decodeBase64Url(encodedHeader));
        if (header.alg !== ALGORITHM || header.enc !== ENC_ALGORITHM) return null;

        const iv = base64UrlDecodeSafe(encodedIv);
        const encrypted = base64UrlDecodeSafe(encodedEncrypted);
        const authTag = base64UrlDecodeSafe(encodedAuthTag);
        const aad = Buffer.from(encodedHeader);

        const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, iv) as DecipherGCM;
        decipher.setAAD(aad);
        decipher.setAuthTag(authTag);

        const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const payload = JSON.parse(plaintext.toString());

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

        return payload;
    } catch {
        return null;
    }
}

export function signEncrypted(payload: JWTPayload, secret: string, options: EncryptedJWTOptions = { secret }): string {
    return encrypt(payload, secret, options);
}

export function verifyEncrypted(token: string, secret: string): JWTPayload | null {
    return decrypt(token, secret);
}

export function createTokenPair(payload: JWTPayload, secret: string, options: JWTOptions = {}): { accessToken: string; refreshToken: string } {
    const accessToken = sign(payload, secret, options);
    const refreshPayload = { ...payload, type: "refresh" };
    const refreshToken = sign(refreshPayload, secret, { ...options, expiresIn: "7d" });

    return { accessToken, refreshToken };
}

export function verifyTokenPair(token: string, secret: string): { accessToken: JWTPayload | null; refreshToken: JWTPayload | null } {
    const [accessToken, refreshToken] = token.split(".");
    return {
        accessToken: verify(accessToken, secret),
        refreshToken: verify(refreshToken, secret)
    };
}
