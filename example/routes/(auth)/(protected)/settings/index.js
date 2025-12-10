import { Router } from "../../../../../dist/esm/index.js";

const router = Router();

// Route: /settings (route groups are ignored, "settings" folder counts)
router.get("/", (req, res) => res.send("User settings"));

export default router;