// OpenAPI 3.0 converter for Zod schemas.
// Handles object, string (with format/min/max/regex), number (int/min/max), boolean,
// array, enum, native enum, literal, union, intersection, tuple, record,
// optional, nullable, default, effects (refinements pass-through), discriminated union.

type AnySchema = any;

export interface ConvertOptions {
    /** Treat optional zods as `required: false` (default: true). */
    respectOptional?: boolean;
    /** Component name → schema map for $ref reuse. Mutated in place. */
    components?: Record<string, any>;
    /** Limit recursion depth to prevent infinite loops on cyclic refs. Default: 16 */
    maxDepth?: number;
}

export function zodToOpenAPI(schema: AnySchema, options: ConvertOptions = {}, depth = 0): any {
    if (!schema) return {};
    if (depth > (options.maxDepth ?? 16)) return {};

    const def = schema._def;
    if (!def) return {};
    const t = def.typeName as string | undefined;

    switch (t) {
        case "ZodString": return convertString(def);
        case "ZodNumber": return convertNumber(def);
        case "ZodBigInt": return { type: "integer", format: "int64" };
        case "ZodBoolean": return { type: "boolean" };
        case "ZodDate": return { type: "string", format: "date-time" };
        case "ZodLiteral": return convertLiteral(def);
        case "ZodEnum": return { type: "string", enum: def.values };
        case "ZodNativeEnum": {
            const values = Object.values(def.values).filter(v => typeof v === "string" || typeof v === "number");
            return { enum: values };
        }
        case "ZodArray": {
            const inner = zodToOpenAPI(def.type, options, depth + 1);
            const out: any = { type: "array", items: inner };
            if (def.minLength?.value != null) out.minItems = def.minLength.value;
            if (def.maxLength?.value != null) out.maxItems = def.maxLength.value;
            return out;
        }
        case "ZodTuple": {
            return {
                type: "array",
                items: { oneOf: def.items.map((it: any) => zodToOpenAPI(it, options, depth + 1)) },
                minItems: def.items.length,
                maxItems: def.rest ? undefined : def.items.length
            };
        }
        case "ZodObject": return convertObject(def, options, depth);
        case "ZodUnion": return { oneOf: def.options.map((o: any) => zodToOpenAPI(o, options, depth + 1)) };
        case "ZodDiscriminatedUnion": {
            const options_ = Array.from(def.optionsMap?.values?.() ?? def.options ?? []);
            return {
                oneOf: options_.map((o: any) => zodToOpenAPI(o, options, depth + 1)),
                discriminator: { propertyName: def.discriminator }
            };
        }
        case "ZodIntersection": {
            return { allOf: [zodToOpenAPI(def.left, options, depth + 1), zodToOpenAPI(def.right, options, depth + 1)] };
        }
        case "ZodRecord": return { type: "object", additionalProperties: zodToOpenAPI(def.valueType, options, depth + 1) };
        case "ZodMap": return { type: "object" };
        case "ZodSet": return { type: "array", items: zodToOpenAPI(def.valueType, options, depth + 1), uniqueItems: true };
        case "ZodOptional": return zodToOpenAPI(def.innerType, options, depth + 1);
        case "ZodNullable": {
            const inner = zodToOpenAPI(def.innerType, options, depth + 1);
            return { ...inner, nullable: true };
        }
        case "ZodDefault": {
            const inner = zodToOpenAPI(def.innerType, options, depth + 1);
            try { inner.default = def.defaultValue(); } catch { /* ignore */ }
            return inner;
        }
        case "ZodEffects": return zodToOpenAPI(def.schema, options, depth + 1);
        case "ZodPipeline": return zodToOpenAPI(def.in, options, depth + 1);
        case "ZodLazy": {
            try { return zodToOpenAPI(def.getter(), options, depth + 1); }
            catch { return {}; }
        }
        case "ZodAny":
        case "ZodUnknown": return {};
        case "ZodNever":
        case "ZodVoid":
        case "ZodNull": return { type: "null" } as any;
        case "ZodUndefined": return {};
        default: return {};
    }
};

function convertString(def: any): any {
    const out: any = { type: "string" };
    const checks: Array<{ kind: string; value?: any; regex?: RegExp; min?: number; max?: number }> = def.checks ?? [];
    for (const c of checks) {
        switch (c.kind) {
            case "min": out.minLength = c.value; break;
            case "max": out.maxLength = c.value; break;
            case "length": out.minLength = c.value; out.maxLength = c.value; break;
            case "email": out.format = "email"; break;
            case "url": out.format = "uri"; break;
            case "uuid": out.format = "uuid"; break;
            case "cuid":
            case "cuid2": out.pattern = "^c[a-z0-9]+$"; break;
            case "datetime": out.format = "date-time"; break;
            case "ip": out.format = c.value === "v4" ? "ipv4" : c.value === "v6" ? "ipv6" : "ipv4"; break;
            case "regex": if (c.regex) out.pattern = c.regex.source; break;
            case "startsWith": out.pattern = `^${escapeRegex(c.value as string)}`; break;
            case "endsWith": out.pattern = `${escapeRegex(c.value as string)}$`; break;
        }
    }
    if (def.description) out.description = def.description;
    return out;
};

function convertNumber(def: any): any {
    const out: any = { type: "number" };
    const checks: Array<any> = def.checks ?? [];
    for (const c of checks) {
        switch (c.kind) {
            case "int": out.type = "integer"; break;
            case "min": out.minimum = c.value; if (c.inclusive === false) out.exclusiveMinimum = true; break;
            case "max": out.maximum = c.value; if (c.inclusive === false) out.exclusiveMaximum = true; break;
            case "multipleOf": out.multipleOf = c.value; break;
        }
    }
    if (def.description) out.description = def.description;
    return out;
};

function convertLiteral(def: any): any {
    const value = def.value;
    if (typeof value === "string") return { type: "string", enum: [value] };
    if (typeof value === "number") return { type: "number", enum: [value] };
    if (typeof value === "boolean") return { type: "boolean", enum: [value] };
    return { enum: [value] };
};

function convertObject(def: any, options: ConvertOptions, depth: number): any {
    const shape = typeof def.shape === "function" ? def.shape() : def.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape || {})) {
        const v = value as AnySchema;
        const innerDef = v?._def;
        const isOptional = innerDef?.typeName === "ZodOptional" || innerDef?.typeName === "ZodDefault" || innerDef?.typeName === "ZodUndefined";
        properties[key] = zodToOpenAPI(v, options, depth + 1);
        if (!isOptional && (options.respectOptional ?? true)) required.push(key);
    }

    const out: any = { type: "object", properties };
    if (required.length > 0) out.required = required;
    if (def.unknownKeys === "passthrough") out.additionalProperties = true;
    else if (def.unknownKeys === "strict") out.additionalProperties = false;
    if (def.description) out.description = def.description;
    return out;
};

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ─── Param-style converter (for query string and headers) ─────────────────

export interface ParamSpec {
    name: string;
    in: "query" | "header" | "path" | "cookie";
    required: boolean;
    schema: any;
    description?: string;
}

export function zodObjectToParams(schema: AnySchema, location: "query" | "header" | "path" | "cookie", options: ConvertOptions = {}): ParamSpec[] {
    if (!schema?._def) return [];
    const def = schema._def;
    if (def.typeName !== "ZodObject") return [];
    const shape = typeof def.shape === "function" ? def.shape() : def.shape;
    const params: ParamSpec[] = [];

    for (const [key, value] of Object.entries(shape || {})) {
        const v = value as AnySchema;
        const innerDef = v?._def;
        const isOptional = innerDef?.typeName === "ZodOptional" || innerDef?.typeName === "ZodDefault";
        const inner = isOptional ? (innerDef.innerType ?? v) : v;
        const propSchema = zodToOpenAPI(inner, options);
        params.push({
            name: key,
            in: location,
            required: !isOptional,
            schema: propSchema,
            description: inner._def?.description
        });
    }
    return params;
};