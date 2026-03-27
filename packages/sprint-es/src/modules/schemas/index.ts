import { Readable } from "stream";
import { RequestHandler } from "express";
import { z, ZodSchema as ZodSchemaType, ZodTypeDef, ZodIssue } from "zod";
import { FileObject, FileSchemaType, FileValidationOptions } from "./types";

export type AuthorizationSource = `query:${string}` | `headers:${string}`;

export interface SprintAuthorizationOptions {
    sources?: AuthorizationSource | AuthorizationSource[];
}

function normalizeExtensions(ext: string | string[] | undefined): string[] {
    if (!ext) return [];
    return (Array.isArray(ext) ? ext : [ext]).map(e => e.toLowerCase().startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`);
};

function normalizeMimeTypes(mime: string | string[] | undefined): string[] {
    if (!mime) return [];
    return (Array.isArray(mime) ? mime : [mime]).map(m => m.toLowerCase());
};

function createFileSchema(options: FileValidationOptions = {}, isStream: boolean = false): FileSchemaType {
    const extensions = normalizeExtensions(options.ext);
    const mimeTypes = normalizeMimeTypes(options.mimeType);
    const finalIsStream = options._isStream || isStream;

    const baseSchema = {
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.string(),
        size: z.number()
    };
    
    const extendedSchema = finalIsStream ? { ...baseSchema, file: z.instanceof(Readable).optional() as any } : { ...baseSchema, buffer: z.instanceof(Buffer).optional() as any };

    const fileSchema = z.object(extendedSchema as any);

    let schemaWithValidations: any = fileSchema;

    if (extensions.length > 0) {
        schemaWithValidations = schemaWithValidations.refine(
            (file: any) => {
                const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));
                return extensions.includes(fileExt);
            },
            { message: `Invalid file extension. Allowed: ${extensions.join(", ")}`, path: ["originalname"] }
        );
    }

    if (mimeTypes.length > 0) {
        schemaWithValidations = schemaWithValidations.refine(
            (file: any) => mimeTypes.includes(file.mimetype.toLowerCase()),
            { message: `Invalid mime type. Allowed: ${mimeTypes.join(", ")}`, path: ["mimetype"] }
        );
    }

    if (options.maxSize !== undefined) {
        schemaWithValidations = schemaWithValidations.refine(
            (file: any) => file.size <= options.maxSize!,
            { message: `File size exceeds maximum of ${options.maxSize} bytes`, path: ["size"] }
        );
    }

    if (options.minSize !== undefined) {
        schemaWithValidations = schemaWithValidations.refine(
            (file: any) => file.size >= options.minSize!,
            { message: `File size must be at least ${options.minSize} bytes`, path: ["size"] }
        );
    }

    const chainedSchema = Object.create(schemaWithValidations);
    chainedSchema.format = (ext: string | string[]) => createFileSchema({ ...options, ext: normalizeExtensions(ext), _isStream: finalIsStream }, finalIsStream);
    chainedSchema.mimeType = (mime: string | string[]) => createFileSchema({ ...options, mimeType: normalizeMimeTypes(mime), _isStream: finalIsStream }, finalIsStream);
    chainedSchema.maxSize = (size: number) => createFileSchema({ ...options, maxSize: size, _isStream: finalIsStream }, finalIsStream);
    chainedSchema.minSize = (size: number) => createFileSchema({ ...options, minSize: size, _isStream: finalIsStream }, finalIsStream);
    chainedSchema.stream = () => createFileSchema({ ...options, _isStream: true }, true);
    chainedSchema.image = () => createFileSchema({
        mimeType: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
        ext: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
        _isStream: finalIsStream
    }, finalIsStream);
    chainedSchema.document = () => createFileSchema({
        mimeType: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
        ext: ["pdf", "doc", "docx", "txt"],
        _isStream: finalIsStream
    }, finalIsStream);
    chainedSchema.video = () => createFileSchema({
        mimeType: ["video/mp4", "video/webm", "video/ogg"],
        ext: ["mp4", "webm", "ogg"],
        _isStream: finalIsStream
    }, finalIsStream);
    chainedSchema.audio = () => createFileSchema({
        mimeType: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
        ext: ["mp3", "wav", "ogg", "webm"],
        _isStream: finalIsStream
    }, finalIsStream);
    chainedSchema.archive = () => createFileSchema({
        mimeType: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"],
        ext: ["zip", "rar", "7z"],
        _isStream: finalIsStream
    }, finalIsStream);
    chainedSchema.any = () => createFileSchema({ ...options, _isStream: finalIsStream }, finalIsStream);
    chainedSchema._isStream = finalIsStream;
    chainedSchema._extensions = extensions;
    chainedSchema._mimeTypes = mimeTypes;
    chainedSchema._maxSize = options.maxSize;
    chainedSchema._minSize = options.minSize;

    return chainedSchema;
};

function createFilesArraySchema(fieldName: string, options: FileValidationOptions = {}): ZodSchemaType<FileObject[], ZodTypeDef, FileObject[]> {
    const fileSchema = createFileSchema({ ...options, required: false }) as unknown as ZodSchemaType<FileObject, ZodTypeDef, FileObject>;
    return z.array(fileSchema).min(options.required === false ? 0 : 1, {
        message: options.required === false ? undefined : `At least one file is required for field "${fieldName}"`
    });
};

const fileValidators: FileSchemaType = {
    format: (ext: string | string[]) => createFileSchema({ ext: normalizeExtensions(ext) }) as unknown as FileSchemaType,
    mimeType: (mimeType: string | string[]) => createFileSchema({ mimeType: normalizeMimeTypes(mimeType) }) as unknown as FileSchemaType,
    maxSize: (maxSize: number) => createFileSchema({ maxSize }) as unknown as FileSchemaType,
    minSize: (minSize: number) => createFileSchema({ minSize }) as unknown as FileSchemaType,
    stream: () => createFileSchema({ _isStream: true }, true) as unknown as FileSchemaType,
    image: () => createFileSchema({ mimeType: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"], ext: ["jpg", "jpeg", "png", "gif", "webp", "svg"] }) as unknown as FileSchemaType,
    document: () => createFileSchema({ mimeType: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"], ext: ["pdf", "doc", "docx", "txt"] }) as unknown as FileSchemaType,
    video: () => createFileSchema({ mimeType: ["video/mp4", "video/webm", "video/ogg"], ext: ["mp4", "webm", "ogg"] }) as unknown as FileSchemaType,
    audio: () => createFileSchema({ mimeType: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"], ext: ["mp3", "wav", "ogg", "webm"] }) as unknown as FileSchemaType,
    archive: () => createFileSchema({ mimeType: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"], ext: ["zip", "rar", "7z"] }) as unknown as FileSchemaType,
    any: () => createFileSchema({}) as unknown as FileSchemaType,
    field: (fieldName: string, options?: FileValidationOptions) => createFilesArraySchema(fieldName, options),
    _isStream: false
} as unknown as FileSchemaType;

export function normalizeHeadersSchema(schema: any): any {
    const shape = schema.shape ?? schema._def?.shape?.();
    if (!shape) return schema;
    const normalizedShape = Object.fromEntries(Object.entries(shape).map(([key, value]) => [key.toLowerCase(), value])) as Record<string, any>;
    return z.object(normalizedShape as any);
};

function createSprintAuthorizationSchema(options?: SprintAuthorizationOptions): ZodSchemaType<string, ZodTypeDef, string> {
    const defaultSources: AuthorizationSource[] = ["query:token", "headers:authorization"];
    const sources = options?.sources ? (Array.isArray(options.sources) ? options.sources : [options.sources]) : defaultSources;

    return z.string().describe(JSON.stringify({ __sprintAuthorization: true, sources })) as ZodSchemaType<string, ZodTypeDef, string>;
};

const sprintBuilder = {
    authorization: createSprintAuthorizationSchema
};

const sprintAuth = {
    authorization: createSprintAuthorizationSchema
};

type SprintCallable = typeof sprintAuth & (() => typeof sprintAuth);

const sprintCallable: SprintCallable = function () {
    return sprintAuth;
} as SprintCallable;

Object.assign(sprintCallable, sprintAuth);

type ZodWithSprint = typeof z & {
    sprint: SprintCallable;
    files: typeof fileValidators;
};

const proxyZ = new Proxy(z, {
    get(target, prop) {
        if (prop === "sprint") return sprintCallable;
        if (prop === "files") return fileValidators;
        return (target as any)[prop];
    }
}) as ZodWithSprint;

export { proxyZ as z };
export { sprintBuilder as sprint };
export { fileValidators as files };
export { createFileSchema, createFilesArraySchema };

export type { FileSchemaType, SprintFiles } from "./types";

export interface RouteSchemaOptions {
    body?: ZodSchemaType<any, ZodTypeDef, any>;
    queryParams?: ZodSchemaType<any, ZodTypeDef, any>;
    params?: ZodSchemaType<any, ZodTypeDef, any>;
    headers?: ZodSchemaType<any, ZodTypeDef, any>;
    files?: {
        [fieldName: string]: ZodSchemaType<any, ZodTypeDef, any>;
    };
    sprint?: {
        authorization?: ZodSchemaType<string, ZodTypeDef, string>;
    };
}

interface ZodErrorItem {
    path: string;
    message: string;
}

function parseSchema(schema: ZodSchemaType<any, ZodTypeDef, any>, data: any): { success: true; data: any; } | { success: false; errors: ZodErrorItem[]; } {
    const result = schema.safeParse(data);
    if (!result.success) {
        return {
            success: false,
            errors: result.error.issues.map((issue: ZodIssue): ZodErrorItem => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        };
    }
    return { success: true, data: result.data };
};

export function defineRouteSchema<T extends RouteSchemaOptions>(schema: T): RequestHandler & { 
    getFileFields?: () => string[];
    hasStreamingFiles?: () => boolean;
} {
    const headersSchema = schema.headers ? normalizeHeadersSchema(schema.headers) : null;
    
    const fileFields = schema.files ? Object.keys(schema.files) : [];
    
    const hasStreaming = !!(schema.files && typeof schema.files === "object" && Object.values(schema.files).some(f => !!(f as any)._isStream));

    const middleware = (req: any, res: any, next: any) => {
        const errors: Array<{ location: string; path: string; message: string; }> = [];
        const method = req.method.toUpperCase();
        const noBodyMethods = ["GET", "HEAD", "DELETE"];

        if (schema.body && !noBodyMethods.includes(method)) {
            const result = parseSchema(schema.body, req.body);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "body", ...e })));
        }

        if (schema.queryParams) {
            const result = parseSchema(schema.queryParams, req.query);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "queryParams", ...e })));
        }

        if (schema.params) {
            const result = parseSchema(schema.params, req.params);
            if (!result.success) errors.push(...result.errors.map(e => ({ location: "params", ...e })));
        }

        if (headersSchema) {
            const normalizedHeaders = Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), value]));
            const result = headersSchema.safeParse(normalizedHeaders);
            if (!result.success) errors.push(...result.errors.map((e: any) => ({ location: "headers", ...e })));
        }

        if (schema.files && typeof schema.files === "object") {
            for (const [fieldName, fieldSchema] of Object.entries(schema.files)) {
                const fieldFiles = (req as any).files?.[fieldName] || [];
                const filesArray = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];

                const isOptional = (fieldSchema as any).isOptional ? (fieldSchema as any).isOptional() : false;

                if (filesArray.length === 0 && isOptional) continue;

                for (const file of filesArray) {
                    const result = parseSchema(fieldSchema, file);
                    if (!result.success) errors.push(...result.errors.map(e => ({ location: "files", path: fieldName, message: `${e.path || fieldName}: ${e.message}` })));
                }
            }
        }

        if (schema.sprint?.authorization) {
            const authSchema = schema.sprint.authorization;
            const description = authSchema._def?.description;
            let sources: AuthorizationSource[] = ["query:token", "headers:authorization"];
            
            if (description) {
                try {
                    const parsed = JSON.parse(description);
                    if (parsed.__sprintAuthorization && parsed.sources) sources = Array.isArray(parsed.sources) ? parsed.sources : [parsed.sources];
                } catch {}
            }

            let authValue: string | undefined;
            for (const source of sources) {
                const [type, key] = source.split(":") as [string, string];
                if (type === "query") {
                    const value = req.query[key];
                    if (typeof value === "string" && value.length > 0) {
                        authValue = value;
                        break;
                    }
                } else if (type === "headers") {
                    const value = req.headers[key.toLowerCase()];
                    if (typeof value === "string" && value.length > 0) {
                        authValue = value;
                        break;
                    }
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string" && value[0].length > 0) {
                        authValue = value[0];
                        break;
                    }
                }
            }

            if (!authValue) errors.push({ location: "sprint.authorization", path: "authorization", message: "Authorization header or query parameter not found" });
            else (req.sprint as any).authorization = authValue;
        }

        if (errors.length > 0) return res.status(400).json({ error: "Validation failed", details: errors });

        next();
    };

    // Attach schema to middleware.
    (middleware as any).__sprintRouteSchema = schema;
    middleware.getFileFields = () => fileFields;
    middleware.hasStreamingFiles = () => hasStreaming || false;

    return middleware;
};

export type { ZodSchema, ZodMiddlewareOptions, FileValidationOptions } from "./types";