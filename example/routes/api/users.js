import { Router } from "../../../dist/esm/index.js";

const router = Router();

// GET /api/users - Requires auth (protected by auth middleware).
router.get("/", (req, res) => {
    res.json({
        message: "Users list",
        user: req.user,
        users: [
            { id: 1, name: "John Doe" },
            { id: 2, name: "Jane Smith" }
        ]
    });
});

// GET /api/users/:id.
router.get("/:id", (req, res) => {
    res.json({
        message: `User ${req.params.id}`,
        user: req.user
    });
});

export default router;