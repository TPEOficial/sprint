import { defineMiddleware } from "../../dist/esm/index.js";

export default defineMiddleware({
    name: "admin",
    priority: 20, // Runs after auth.
    include: "/admin/**",
    handler: (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });

        if (req.user.role !== "admin") {
            console.log(`[Sprint Example: Admin] Access denied for user: ${req.user.name} (role: ${req.user.role})`);
            return res.status(403).json({
                error: "Forbidden",
                message: "Admin access required"
            });
        }

        console.log(`[Sprint Example: Admin] Admin access granted for: ${req.user.name}`);
        next();
    }
});