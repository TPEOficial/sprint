import { z } from "sprint-es/schemas";
import { defineMiddleware, SprintRequest, SprintResponse, NextFunction } from "sprint-es";

export default defineMiddleware({
    name: "adminAuth",
    priority: 10,
    include: "/admin/**",
    schema: {
        sprint: {
            authorization: z.sprint().authorization()
        },
        headers: z.object({
            "X-Intranet-Origin": z.literal("https://domain.com", {
                // This is an example of how to display a custom error message to avoid filtering values that should not be publicly known.
                errorMap: () => ({ message: "Invalid intranet origin" })
            })
        })
    },
    handler: (req: SprintRequest, res: SprintResponse, next: NextFunction) => {
        const auth = req.sprint.authorization!;

        const token = auth.replace("Bearer ", "");

        if (token !== "admin-token") return res.status(403).json({ error: "Invalid token" });

        console.log(req.headers.origin)

        next();
    }
});