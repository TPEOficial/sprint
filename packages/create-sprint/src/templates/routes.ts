export interface MainFileFeatures {
    queue?: "none" | "memory" | "bullmq";
    cache?: "none" | "memory" | "redis";
    websocket?: boolean;
    trpc?: boolean;
    grpc?: boolean;
    csrf?: boolean;
}

export function getMainFile(language: string, graphql: boolean = false, features?: MainFileFeatures): string {
    const isTs = language === "typescript";
    const ext = isTs ? "" : ".js";

    const imports: string[] = [`import Sprint from "sprint-es";`];
    const setup: string[] = [`const app = new Sprint();`];

    if (graphql) {
        imports.push(`import { graphqlSchema } from "./graphql/schema${ext}";`);
        setup.push(`app.setGraphQLSchema(graphqlSchema);`);
    }

    if (features?.queue && features.queue !== "none") {
        imports.push(`import "./services/queue${ext}";`);
    }
    if (features?.cache && features.cache !== "none") {
        imports.push(`import "./services/cache${ext}";`);
    }

    if (features?.csrf) {
        // CSRF is registered via defineMiddleware in src/middlewares/csrf.ts; just hint here
    }

    if (features?.trpc) {
        imports.push(`import { attachTrpc } from "sprint-es/trpc";`);
        imports.push(`import { appRouter } from "./trpc/router${ext}";`);
        setup.push(`await app.ready;`);
        setup.push(`await attachTrpc({ app: app.app, router: appRouter });`);
    }

    if (features?.websocket) {
        imports.push(`import { attachWebSocket } from "sprint-es/ws";`);
        imports.push(`import { chatHandler } from "./ws/chat${ext}";`);
        setup.push(`{
    const server = await app.onListen();
    await attachWebSocket({ server, handlers: { "/ws/chat": chatHandler } });
}`);
    }

    if (features?.grpc) {
        imports.push(`import { startGrpcServer } from "./grpc/server${ext}";`);
        setup.push(`startGrpcServer().catch(err => console.error("[grpc] failed to start", err));`);
    }

    return imports.join("\n") + "\n\n" + setup.join("\n") + "\n";
};

export function getHomeRoute(language: string) {
    if (language === "typescript") {
        return `import { Router } from "sprint-es";
import { homeSchema } from "@/schemas/home";
import { homeController, jwtValidateController } from "@/controllers/home";

const router = Router();

router.get("/", homeSchema, homeController);
router.post("/me", jwtValidateController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { homeSchema } from "../schemas/home.js";
import { homeController, jwtValidateController } from "../controllers/home.js";

const router = Router();

router.get("/", homeSchema, homeController);
router.post("/me", jwtValidateController);

export default router;
`;
};

export function getAdminRoute(language: string) {
    if (language === "typescript") {
        return `import { Router } from "sprint-es";
import { adminSchema, jwtGenerateSchema } from "@/schemas/admin";
import { adminController, adminUsersController, jwtGenerateController } from "@/controllers/admin";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);
router.post("/jwt/generate", jwtGenerateSchema, jwtGenerateController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { adminSchema, jwtGenerateSchema } from "../schemas/admin.js";
import { adminController, adminUsersController, jwtGenerateController } from "../controllers/admin.js";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);
router.post("/jwt/generate", jwtGenerateSchema, jwtGenerateController);

export default router;
`;
};

export function getUploadRoute(language: string) {
    if (language === "typescript") {
        return `import { Router } from "sprint-es";
import { uploadPdfSchema, uploadMultiplePdfsSchema, streamUploadSchema } from "@/schemas/upload";
import { uploadPdfController, uploadMultiplePdfsController, streamUploadController } from "@/controllers/upload";

const router = Router();

router.post("/pdf", uploadPdfSchema, uploadPdfController);
router.post("/pdfs", uploadMultiplePdfsSchema, uploadMultiplePdfsController);
router.post("/stream", streamUploadSchema, streamUploadController);

export default router;
`;
    }
    return `import { Router } from "sprint-es";
import { uploadPdfSchema, uploadMultiplePdfsSchema, streamUploadSchema } from "../schemas/upload.js";
import { uploadPdfController, uploadMultiplePdfsController, streamUploadController } from "../controllers/upload.js";

const router = Router();

router.post("/pdf", uploadPdfSchema, uploadPdfController);
router.post("/pdfs", uploadMultiplePdfsSchema, uploadMultiplePdfsController);
router.post("/stream", streamUploadSchema, streamUploadController);

export default router;
`;
};