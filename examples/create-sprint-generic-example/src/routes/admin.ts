import { Router } from "sprint-es";
import { adminSchema, jwtGenerateSchema } from "@/schemas/admin";
import { adminController, adminUsersController, jwtGenerateController } from "@/controllers/admin";

const router = Router();

router.get("/", adminSchema, adminController);
router.get("/users", adminSchema, adminUsersController);
router.post("/jwt/generate", jwtGenerateSchema, jwtGenerateController);

export default router;