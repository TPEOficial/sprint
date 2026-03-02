export function getHomeSchema(language: string) {
    if (language === "typescript") {
        return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const homeSchema = defineRouteSchema({});
`;
    }
    return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const homeSchema = defineRouteSchema({});
`;
};

export function getAdminSchema(language: string) {
    if (language === "typescript") {
        return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const adminSchema = defineRouteSchema({
    queryParams: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().min(1),
        email: z.string().email().optional()
    })
});

export const jwtGenerateSchema = defineRouteSchema({
    body: z.object({
        userId: z.string().min(1),
        role: z.string().optional()
    })
});
`;
    }
    return `import { z, defineRouteSchema } from "sprint-es/schemas";

export const adminSchema = defineRouteSchema({
    queryParams: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().min(1),
        email: z.string().email().optional()
    })
});

export const jwtGenerateSchema = defineRouteSchema({
    body: z.object({
        userId: z.string().min(1),
        role: z.string().optional()
    })
});
`;
};