import { Router } from "../../dist/esm/index.js";

const router = Router();

router.get("/", (req, res) => res.send("Hello World 2!"));

export default router;