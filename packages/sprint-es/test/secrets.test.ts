import { afterEach, describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import os from "os";
import {
    EnvSecretProvider,
    FileSecretProvider,
    MemoizedSecretProvider,
    CompositeSecretProvider
} from "../src/modules/secrets";

describe("EnvSecretProvider", () => {
    it("reads from env source", () => {
        const p = new EnvSecretProvider({ source: { DB_PASSWORD: "hunter2" } });
        expect(p.get("DB_PASSWORD")).toBe("hunter2");
    });

    it("supports prefix", () => {
        const p = new EnvSecretProvider({ prefix: "APP_", source: { APP_KEY: "x" } });
        expect(p.get("KEY")).toBe("x");
    });

    it("throws when required and missing", () => {
        const p = new EnvSecretProvider({ source: {} });
        expect(() => p.get("MISSING", { required: true })).toThrow();
    });

    it("returns defaultValue when missing", () => {
        const p = new EnvSecretProvider({ source: {} });
        expect(p.get("X", { defaultValue: "fallback" })).toBe("fallback");
    });
});

describe("FileSecretProvider", () => {
    let tmp: string;
    afterEach(() => { try { fs.unlinkSync(tmp); } catch { /* ignore */ } });

    it("reads .env format", () => {
        tmp = path.join(os.tmpdir(), `sprint-${Date.now()}.env`);
        fs.writeFileSync(tmp, '# comment\nFOO=bar\nQUOTED="hello world"\nEMPTY=\n');
        const p = new FileSecretProvider({ path: tmp });
        expect(p.get("FOO")).toBe("bar");
        expect(p.get("QUOTED")).toBe("hello world");
        expect(p.get("EMPTY")).toBeUndefined();
    });

    it("reads JSON format", () => {
        tmp = path.join(os.tmpdir(), `sprint-${Date.now()}.json`);
        fs.writeFileSync(tmp, JSON.stringify({ KEY: "value", NUM: 42 }));
        const p = new FileSecretProvider({ path: tmp, format: "json" });
        expect(p.get("KEY")).toBe("value");
        expect(p.get("NUM")).toBe("42");
    });
});

describe("MemoizedSecretProvider", () => {
    it("caches inner provider lookups", async () => {
        let calls = 0;
        const inner = {
            get(key: string) { calls++; return calls === 1 ? "first" : "second"; }
        };
        const p = new MemoizedSecretProvider({ inner: inner as any, ttlMs: 1000 });
        expect(await p.get("X")).toBe("first");
        expect(await p.get("X")).toBe("first");
        expect(calls).toBe(1);
    });

    it("refresh() clears cache", async () => {
        let calls = 0;
        const inner = { get() { calls++; return `v${calls}`; } };
        const p = new MemoizedSecretProvider({ inner: inner as any, ttlMs: 1000 });
        expect(await p.get("X")).toBe("v1");
        await p.refresh();
        expect(await p.get("X")).toBe("v2");
    });
});

describe("CompositeSecretProvider", () => {
    it("first match wins", async () => {
        const c = new CompositeSecretProvider([
            new EnvSecretProvider({ source: {} }),
            new EnvSecretProvider({ source: { K: "second" } }),
            new EnvSecretProvider({ source: { K: "third" } })
        ]);
        expect(await c.get("K")).toBe("second");
    });

    it("returns defaultValue when none match", async () => {
        const c = new CompositeSecretProvider([new EnvSecretProvider({ source: {} })]);
        expect(await c.get("MISSING", { defaultValue: "fb" })).toBe("fb");
    });
});
