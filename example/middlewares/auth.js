import { defineMiddleware } from "../../dist/esm/index.js";

export default defineMiddleware({
    name: "auth",
    priority: 10,
    include: ["/api/**", "/admin/**"],
    exclude: ["/api/public/**"],
    handler: (req, res, next) => {
        const token = ((req.headers["authorization"] || req.headers["Authorization"] || req.query.accesstoken))?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authorization header with Bearer token is required"
            });
        }

        // Simulate token validation.
        if (token === "valid-token") {
            req.user = { id: 1, name: "John Doe", role: "user" };
            console.log(`[Auth] User authenticated: ${req.user.name}`);
            next();
        } else if (token === "admin-token") {
            req.user = { id: 0, name: "Admin", role: "admin" };
            console.log(`[Auth] Admin authenticated: ${req.user.name}`);
            next();
        } else {
            return res.status(401).json({
                error: "Invalid token",
                message: "The provided token is not valid"
            });
        }
    }
});
