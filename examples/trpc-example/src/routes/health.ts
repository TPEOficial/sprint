import { Router } from "sprint-es";

const router = Router();
router.get("/", (_, res) => res.json({ name: "trpc-example", trpc: "/trpc" }));
export default router;