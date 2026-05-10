import { describe, expect, it } from "@jest/globals";
import {
    parseOffsetPagination,
    parseCursorPagination,
    offsetEnvelope,
    cursorEnvelope,
    parseFilters,
    parseSort
} from "../src/modules/pagination";

const req = (query: Record<string, any>): any => ({ query });

describe("offset pagination", () => {
    it("uses defaults when query empty", () => {
        const r = parseOffsetPagination(req({}));
        expect(r).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    it("clamps limit to maxLimit", () => {
        const r = parseOffsetPagination(req({ limit: "9999" }), { maxLimit: 50 });
        expect(r.limit).toBe(50);
    });

    it("ignores invalid page numbers", () => {
        expect(parseOffsetPagination(req({ page: "0" })).page).toBe(1);
        expect(parseOffsetPagination(req({ page: "-3" })).page).toBe(1);
        expect(parseOffsetPagination(req({ page: "abc" })).page).toBe(1);
    });

    it("computes offset", () => {
        const r = parseOffsetPagination(req({ page: "3", limit: "10" }));
        expect(r.offset).toBe(20);
    });
});

describe("cursor pagination", () => {
    it("returns null cursor when missing", () => {
        const r = parseCursorPagination(req({}));
        expect(r.cursor).toBeNull();
    });

    it("returns cursor string when present", () => {
        const r = parseCursorPagination(req({ cursor: "abc123" }));
        expect(r.cursor).toBe("abc123");
    });
});

describe("offsetEnvelope", () => {
    it("includes total info when total provided", () => {
        const env = offsetEnvelope(["a", "b", "c"], { page: 2, limit: 3, offset: 3 }, 10);
        expect(env.pagination.total).toBe(10);
        expect(env.pagination.totalPages).toBe(4);
        expect(env.pagination.hasNext).toBe(true);
        expect(env.pagination.hasPrev).toBe(true);
    });

    it("infers hasNext from data length when total absent", () => {
        const env = offsetEnvelope([1, 2, 3], { page: 1, limit: 3, offset: 0 });
        expect(env.pagination.hasNext).toBe(true);
        const env2 = offsetEnvelope([1, 2], { page: 1, limit: 3, offset: 0 });
        expect(env2.pagination.hasNext).toBe(false);
    });
});

describe("cursorEnvelope", () => {
    it("hasNext reflects nextCursor", () => {
        expect(cursorEnvelope([], { cursor: null, limit: 10 }, "next").pagination.hasNext).toBe(true);
        expect(cursorEnvelope([], { cursor: null, limit: 10 }, null).pagination.hasNext).toBe(false);
    });
});

describe("parseFilters", () => {
    it("parses operator syntax", () => {
        const out = parseFilters(req({ filter: "age>=18,name=ada" }), { allowedFields: ["age", "name"] });
        expect(out).toEqual([
            { field: "age", op: "gte", value: 18 },
            { field: "name", op: "eq", value: "ada" }
        ]);
    });

    it("parses colon syntax with in/like", () => {
        const out = parseFilters(req({ filter: "role:in:admin|user,bio:like:hello" }), { allowedFields: ["role", "bio"] });
        expect(out).toEqual([
            { field: "role", op: "in", value: ["admin", "user"] },
            { field: "bio", op: "like", value: "hello" }
        ]);
    });

    it("drops fields not in allowedFields", () => {
        const out = parseFilters(req({ filter: "age=18,password=x" }), { allowedFields: ["age"] });
        expect(out).toHaveLength(1);
        expect(out[0].field).toBe("age");
    });

    it("drops ops not allowed for field", () => {
        const out = parseFilters(req({ filter: "age=18,age>10" }), {
            allowedFields: ["age"],
            allowedOps: { age: ["eq"] }
        });
        expect(out).toHaveLength(1);
        expect(out[0].op).toBe("eq");
    });

    it("coerces booleans and null", () => {
        const out = parseFilters(req({ filter: "active=true,deleted=null" }), { allowedFields: ["active", "deleted"] });
        expect(out[0].value).toBe(true);
        expect(out[1].value).toBeNull();
    });
});

describe("parseSort", () => {
    it("parses asc/desc", () => {
        const out = parseSort(req({ sort: "name,-createdAt" }), { allowedFields: ["name", "createdAt"] });
        expect(out).toEqual([
            { field: "name", direction: "asc" },
            { field: "createdAt", direction: "desc" }
        ]);
    });

    it("uses defaultSort when empty", () => {
        const out = parseSort(req({}), { allowedFields: ["x"], defaultSort: [{ field: "x", direction: "desc" }] });
        expect(out).toEqual([{ field: "x", direction: "desc" }]);
    });

    it("drops fields not in allowedFields", () => {
        const out = parseSort(req({ sort: "name,password" }), { allowedFields: ["name"] });
        expect(out).toEqual([{ field: "name", direction: "asc" }]);
    });
});
