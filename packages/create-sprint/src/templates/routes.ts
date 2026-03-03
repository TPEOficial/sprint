export function getMainFile(language: string, graphql: boolean = false) {
    const isTs = language === "typescript";
    const ext = isTs ? "" : ".js";
    
    if (isTs) {
        if (graphql) {
            return `import Sprint from "sprint-es";
import { graphqlSchema } from "./graphql/schema";

const app = new Sprint();
app.setGraphQLSchema(graphqlSchema);
`;
        }
        return `import Sprint from "sprint-es";

const app = new Sprint();
`;
    }

    if (graphql) {
        return `import Sprint from "sprint-es";
import { graphqlSchema } from "./graphql/schema.js";

const app = new Sprint();
app.setGraphQLSchema(graphqlSchema);
`;
    }

    return `import Sprint from "sprint-es";

const app = new Sprint();
`;
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