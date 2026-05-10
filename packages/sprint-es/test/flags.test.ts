import { describe, expect, it } from "@jest/globals";
import {
    StaticFlagProvider,
    EnvFlagProvider,
    CompositeFlagProvider,
    configureFlags,
    flag
} from "../src/modules/flags";

describe("flags", () => {
    describe("StaticFlagProvider", () => {
        it("returns flag value or default", () => {
            const p = new StaticFlagProvider({ a: true, b: "hi" });
            expect(p.get("a", false)).toBe(true);
            expect(p.get("b", "default")).toBe("hi");
            expect(p.get("missing", 42)).toBe(42);
        });
    });

    describe("EnvFlagProvider", () => {
        it("parses booleans, numbers, JSON", () => {
            const p = new EnvFlagProvider({
                source: {
                    SPRINT_FLAG_FOO: "true",
                    SPRINT_FLAG_BAR: "42",
                    SPRINT_FLAG_BAZ: '{"x":1}'
                }
            });
            expect(p.get("foo", false)).toBe(true);
            expect(p.get("bar", 0)).toBe(42);
            expect(p.get("baz", {})).toEqual({ x: 1 });
        });

        it("normalizes dashes/dots in keys", () => {
            const p = new EnvFlagProvider({ source: { SPRINT_FLAG_NEW_CHECKOUT: "1" } });
            expect(p.get("new-checkout", false)).toBe(true);
            expect(p.get("new.checkout", false)).toBe(true);
        });
    });

    describe("CompositeFlagProvider", () => {
        it("first match wins", async () => {
            const c = new CompositeFlagProvider([
                new StaticFlagProvider({}),
                new StaticFlagProvider({ x: "second" }),
                new StaticFlagProvider({ x: "third" })
            ]);
            expect(await c.get("x", "default")).toBe("second");
            expect(await c.get("missing", "default")).toBe("default");
        });
    });

    describe("global flag()", () => {
        it("uses configured provider", async () => {
            configureFlags(new StaticFlagProvider({ feature: true }));
            expect(await flag("feature", false)).toBe(true);
            expect(await flag("missing", "fallback")).toBe("fallback");
        });
    });
});
