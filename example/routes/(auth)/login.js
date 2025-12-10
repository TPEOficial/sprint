import { Router } from "../../../dist/esm/index.js";

const router = Router();

// Route: /login (the "(auth)" folder is ignored in the URL)
router.get("/", (req, res) => res.send("Login page"));
router.post("/", (req, res) => res.send("Login attempt"));

export default router;
