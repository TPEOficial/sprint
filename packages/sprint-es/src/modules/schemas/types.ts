import { z, ZodType, ZodTypeDef } from "zod";

export type ZodSchema = z.ZodType<any>;

export interface ZodMiddlewareOptions {
    body?: ZodSchema;
    queryParams?: ZodSchema;
    params?: ZodSchema;
    headers?: ZodSchema;
    files?: ZodSchema;
    sprint?: {
        authorization?: ZodSchema;
    };
}

export interface FileValidationOptions {
    ext?: string | string[];
    mimeType?: string | string[];
    maxSize?: number;
    minSize?: number;
    required?: boolean;
    _isStream?: boolean;
}

export type FileObject = {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
    file?: NodeJS.ReadableStream;
};

export type StreamFileObject = {
    fieldName: string;
    file: NodeJS.ReadableStream;
    filename: string;
    encoding: string;
    mimeType: string;
};

export type FileSchemaType = ZodType<FileObject, ZodTypeDef, FileObject> & {
    format(ext: string | string[]): FileSchemaType;
    mimeType(mimeType: string | string[]): FileSchemaType;
    maxSize(maxSize: number): FileSchemaType;
    minSize(minSize: number): FileSchemaType;
    stream(): FileSchemaType;
    image(): FileSchemaType;
    document(): FileSchemaType;
    video(): FileSchemaType;
    audio(): FileSchemaType;
    archive(): FileSchemaType;
    any(): FileSchemaType;
    _isStream?: boolean;
    _extensions?: string[];
    _mimeTypes?: string[];
    _maxSize?: number;
    _minSize?: number;
}

export type StreamFileSchemaType = FileSchemaType;

export type SprintFiles = {
    [fieldname: string]: FileObject[];
};