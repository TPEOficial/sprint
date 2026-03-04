import { Router } from "sprint-es";
import { homeSchema } from "@/schemas/home";
import { homeController, jwtValidateController } from "@/controllers/home";

const router = Router();

router.get("/", homeSchema, homeController);
router.post("/me", jwtValidateController);

export default router;