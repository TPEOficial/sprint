import { Router } from "../../../dist/esm/index.js";

const router = Router();

// GET /admin/dashboard - Requires auth + admin role.
router.get("/", (req, res) => {
    res.json({
        message: "Admin Dashboard",
        admin: req.user,
        stats: {
            totalUsers: 150,
            activeUsers: 42,
            revenue: "$12,450"
        }
    });
});

// GET /admin/dashboard/users.
router.get("/users", (req, res) => {
    res.json({
        message: "Admin Users Management",
        admin: req.user,
        users: [
            { id: 1, name: "John", status: "active" },
            { id: 2, name: "Jane", status: "inactive" }
        ]
    });
});

export default router;
