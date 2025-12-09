import { Router } from "../../../../dist/esm/index.js";

const router = Router();

// GET /api/public/test - No auth required (excluded from auth middleware)
router.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "This is a public endpoint - no auth required",
        timestamp: new Date().toISOString()
    });
});

export default router;
