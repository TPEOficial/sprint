import type { Request } from "express";

export interface OffsetParams {
    /** Page number, 1-based. */
    page: number;
    /** Items per page. */
    limit: number;
    /** Computed offset. */
    offset: number;
}

export interface CursorParams {
    /** Decoded cursor (or null on first page). */
    cursor: string | null;
    /** Items per page. */
    limit: number;
}

export interface PaginationDefaults {
    /** Default page size. Default: 20 */
    defaultLimit?: number;
    /** Maximum page size. Default: 100 */
    maxLimit?: number;
    /** Query param key for page. Default: "page" */
    pageKey?: string;
    /** Query param key for limit. Default: "limit" */
    limitKey?: string;
    /** Query param key for cursor. Default: "cursor" */
    cursorKey?: string;
}

function clampLimit(raw: unknown, defaults: PaginationDefaults): number {
    const def = defaults.defaultLimit ?? 20;
    const max = defaults.maxLimit ?? 100;
    const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(n) || n <= 0) return def;
    return Math.min(n, max);
};

export function parseOffsetPagination(req: Request, defaults: PaginationDefaults = {}): OffsetParams {
    const pageKey = defaults.pageKey ?? "page";
    const limitKey = defaults.limitKey ?? "limit";
    const limit = clampLimit(req.query[limitKey], defaults);
    const pageRaw = req.query[pageKey];
    const pageN = typeof pageRaw === "string" ? parseInt(pageRaw, 10) : NaN;
    const page = Number.isFinite(pageN) && pageN > 0 ? pageN : 1;
    return { page, limit, offset: (page - 1) * limit };
};

export function parseCursorPagination(req: Request, defaults: PaginationDefaults = {}): CursorParams {
    const limitKey = defaults.limitKey ?? "limit";
    const cursorKey = defaults.cursorKey ?? "cursor";
    const limit = clampLimit(req.query[limitKey], defaults);
    const raw = req.query[cursorKey];
    const cursor = typeof raw === "string" && raw.length > 0 ? raw : null;
    return { cursor, limit };
};

export interface OffsetEnvelope<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total?: number;
        totalPages?: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface CursorEnvelope<T> {
    data: T[];
    pagination: {
        limit: number;
        nextCursor: string | null;
        hasNext: boolean;
    };
}

export function offsetEnvelope<T>(data: T[], params: OffsetParams, total?: number): OffsetEnvelope<T> {
    const totalPages = total !== undefined ? Math.max(1, Math.ceil(total / params.limit)) : undefined;
    return {
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            ...(total !== undefined ? { total, totalPages } : {}),
            hasNext: total !== undefined ? params.page < (totalPages ?? 1) : data.length === params.limit,
            hasPrev: params.page > 1
        }
    };
};

export function cursorEnvelope<T>(data: T[], params: CursorParams, nextCursor: string | null): CursorEnvelope<T> {
    return {
        data,
        pagination: {
            limit: params.limit,
            nextCursor,
            hasNext: nextCursor !== null
        }
    };
};

// ─── Filter parsing ─────────────────────────────────────────────────────────

export type FilterOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "like" | "exists";

export interface FilterClause {
    field: string;
    op: FilterOp;
    value: unknown;
}

export interface ParseFilterOptions {
    /** Allowed field names. Filters on other fields are dropped. */
    allowedFields: string[];
    /** Query param key. Default: "filter" */
    queryKey?: string;
    /** Allowed operators per field. Default: all. */
    allowedOps?: Record<string, FilterOp[]>;
}

const OP_ALIASES: Record<string, FilterOp> = {
    "=": "eq", "!=": "ne", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte",
    "eq": "eq", "ne": "ne", "gt": "gt", "gte": "gte", "lt": "lt", "lte": "lte",
    "in": "in", "nin": "nin", "like": "like", "exists": "exists"
};

/**
 * Parse filter param into safe clauses.
 *
 * Supported syntax (comma-separated within `?filter=...`):
 * - `field=value`            (eq)
 * - `field>value`, `field<=value` etc.
 * - `field:in:a|b|c`         (list)
 * - `field:like:*foo*`
 * - `field:exists:true`
 *
 * Fields not in `allowedFields` are silently dropped.
 */
export function parseFilters(req: Request, options: ParseFilterOptions): FilterClause[] {
    const queryKey = options.queryKey ?? "filter";
    const raw = req.query[queryKey];
    if (typeof raw !== "string" || raw.length === 0) return [];

    const clauses: FilterClause[] = [];
    const segments = raw.split(",").map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
        // Try colon syntax first: field:op:value.
        const colonMatch = /^([a-zA-Z0-9_.]+):([a-zA-Z]+):(.*)$/.exec(segment);
        let field: string, op: FilterOp, value: unknown;

        if (colonMatch) {
            field = colonMatch[1];
            const opAlias = OP_ALIASES[colonMatch[2].toLowerCase()];
            if (!opAlias) continue;
            op = opAlias;
            const rawValue = colonMatch[3];
            value = op === "in" || op === "nin" ? rawValue.split("|") : coerce(rawValue);
        } else {
            // Operator syntax: field>=value, field=value etc.
            const opMatch = /^([a-zA-Z0-9_.]+)(>=|<=|!=|=|>|<)(.+)$/.exec(segment);
            if (!opMatch) continue;
            field = opMatch[1];
            op = OP_ALIASES[opMatch[2]];
            value = coerce(opMatch[3]);
        }

        if (!options.allowedFields.includes(field)) continue;
        const allowedForField = options.allowedOps?.[field];
        if (allowedForField && !allowedForField.includes(op)) continue;

        clauses.push({ field, op, value });
    }

    return clauses;
};

function coerce(s: string): unknown {
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "null") return null;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    return s;
};

// ─── Sort parsing ───────────────────────────────────────────────────────────

export interface SortClause {
    field: string;
    direction: "asc" | "desc";
}

export interface ParseSortOptions {
    allowedFields: string[];
    /** Default sort if param missing. */
    defaultSort?: SortClause[];
    queryKey?: string;
}

/**
 * Parses `?sort=name,-createdAt` into [{field:"name",direction:"asc"},{field:"createdAt",direction:"desc"}].
 * Fields with leading `-` are descending. Unknown fields dropped.
 */
export function parseSort(req: Request, options: ParseSortOptions): SortClause[] {
    const queryKey = options.queryKey ?? "sort";
    const raw = req.query[queryKey];
    if (typeof raw !== "string" || raw.length === 0) return options.defaultSort ?? [];

    const result: SortClause[] = [];
    for (const part of raw.split(",")) {
        const seg = part.trim();
        if (!seg) continue;
        const direction = seg.startsWith("-") ? "desc" : "asc";
        const field = seg.startsWith("-") ? seg.slice(1) : seg;
        if (!options.allowedFields.includes(field)) continue;
        result.push({ field, direction });
    }
    return result.length > 0 ? result : (options.defaultSort ?? []);
};