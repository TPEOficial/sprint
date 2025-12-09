import Sprint from "../dist/esm/index.js";

const app = new Sprint({
    port: 3000
});

app.get("/", (req, res) => res.json({
    message: "Sprint Example Server",
    endpoints: {
        public: {
            "GET /": "This page",
            "GET /random": "Random route (no auth)",
            "GET /api/public/health": "Public health check (no auth)"
        },
        protected: {
            "GET /api/users": "List users (requires: Bearer valid-token)",
            "GET /api/users/:id": "Get user by ID (requires: Bearer valid-token)"
        },
        admin: {
            "GET /admin/dashboard": "Admin dashboard (requires: Bearer admin-token)",
            "GET /admin/dashboard/users": "Admin users (requires: Bearer admin-token)"
        }
    },
    tokens: {
        user: "valid-token",
        admin: "admin-token"
    }
}));

app.listen(() => {
    console.log("\nTest the middlewares:");
    console.log("  - Public:    curl http://localhost:3000/api/public/health");
    console.log("  - Protected: curl -H 'Authorization: Bearer valid-token' http://localhost:3000/api/users");
    console.log("  - Admin:     curl -H 'Authorization: Bearer admin-token' http://localhost:3000/admin/dashboard");
    console.log("  - Denied:    curl -H 'Authorization: Bearer valid-token' http://localhost:3000/admin/dashboard");
});
