import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import { zodToOpenAPI, zodObjectToParams } from "../src/modules/openapi";

describe("zodToOpenAPI", () => {
    it("converts ZodObject with required and optional fields", () => {
        const schema = z.object({
            name: z.string(),
            age: z.number().int().min(0),
            email: z.string().email().optional()
        });
        const out = zodToOpenAPI(schema);
        expect(out.type).toBe("object");
        expect(out.properties.name).toEqual({ type: "string" });
        expect(out.properties.age).toEqual({ type: "integer", minimum: 0 });
        expect(out.properties.email).toEqual({ type: "string", format: "email" });
        expect(out.required.sort()).toEqual(["age", "name"]);
    });

    it("handles ZodEnum", () => {
        const out = zodToOpenAPI(z.enum(["a", "b", "c"]));
        expect(out).toEqual({ type: "string", enum: ["a", "b", "c"] });
    });

    it("handles ZodLiteral", () => {
        const out = zodToOpenAPI(z.literal("admin"));
        expect(out).toEqual({ type: "string", enum: ["admin"] });
    });

    it("handles ZodUnion", () => {
        const out = zodToOpenAPI(z.union([z.string(), z.number()]));
        expect(out.oneOf).toHaveLength(2);
        expect(out.oneOf[0]).toEqual({ type: "string" });
        expect(out.oneOf[1]).toEqual({ type: "number" });
    });

    it("handles ZodNullable", () => {
        const out = zodToOpenAPI(z.string().nullable());
        expect(out.type).toBe("string");
        expect(out.nullable).toBe(true);
    });

    it("handles ZodDefault", () => {
        const out = zodToOpenAPI(z.boolean().default(true));
        expect(out.type).toBe("boolean");
        expect(out.default).toBe(true);
    });

    it("handles arrays with min/max", () => {
        const out = zodToOpenAPI(z.array(z.string()).min(1).max(5));
        expect(out.type).toBe("array");
        expect(out.items).toEqual({ type: "string" });
        expect(out.minItems).toBe(1);
        expect(out.maxItems).toBe(5);
    });

    it("handles string format URL/UUID/regex", () => {
        expect(zodToOpenAPI(z.string().url()).format).toBe("uri");
        expect(zodToOpenAPI(z.string().uuid()).format).toBe("uuid");
        const re = zodToOpenAPI(z.string().regex(/^[a-z]+$/));
        expect(re.pattern).toBe("^[a-z]+$");
    });

    it("handles ZodEffects (refinement) by passing through inner", () => {
        const out = zodToOpenAPI(z.string().refine(s => s.length > 3));
        expect(out.type).toBe("string");
    });

    it("handles intersection as allOf", () => {
        const out = zodToOpenAPI(z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })));
        expect(out.allOf).toHaveLength(2);
    });

    it("handles record as additionalProperties", () => {
        const out = zodToOpenAPI(z.record(z.string(), z.number()));
        expect(out.type).toBe("object");
        expect(out.additionalProperties).toEqual({ type: "number" });
    });
});

describe("zodObjectToParams", () => {
    it("converts to query param array", () => {
        const out = zodObjectToParams(z.object({
            search: z.string(),
            page: z.number().int().optional()
        }), "query");
        expect(out).toHaveLength(2);
        const search = out.find(p => p.name === "search")!;
        expect(search.required).toBe(true);
        expect(search.in).toBe("query");
        expect(search.schema.type).toBe("string");
        const page = out.find(p => p.name === "page")!;
        expect(page.required).toBe(false);
    });
});
