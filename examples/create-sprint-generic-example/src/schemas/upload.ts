import { z, defineRouteSchema } from "sprint-es/schemas";

export const uploadPdfSchema = defineRouteSchema({
    files: {
        document: z.files.format("pdf").maxSize(10 * 1024 * 1024)
    }
});

export const uploadMultiplePdfsSchema = defineRouteSchema({
    files: {
        documents: z.files.format("pdf").maxSize(10 * 1024 * 1024)
    }
});

export const streamUploadSchema = defineRouteSchema({
    files: {
        file: z.files.document().stream().maxSize(10 * 1024 * 1024)
    }
});