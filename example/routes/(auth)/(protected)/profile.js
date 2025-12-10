import { Router } from "../../../../dist/esm/index.js";

const router = Router();

// Route: /profile (both "(auth)" and "(protected)" folders are ignored in the URL)
router.get("/", (req, res) => res.send("User profile"));

export default router;
