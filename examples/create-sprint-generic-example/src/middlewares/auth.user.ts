import { defineMiddleware, SprintRequest, SprintResponse, NextFunction } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

const { publicKey, encryptionSecret } = getJwtFromEnv();

export default defineMiddleware({
    name: "userAuth",
    priority: 10,
    include: "/**",
    exclude: "/admin/**",
    handler: (req: SprintRequest, res: SprintResponse, next: NextFunction) => {
        const auth = req.sprint.getAuthorization();
        if (!auth) return res.status(401).json({ error: "No authorization header" });

        const token = auth.replace("Bearer ", "");

        const decoded = verifyEncrypted(token, publicKey, encryptionSecret);

        if (!decoded) return res.status(403).json({ error: "Invalid token" });
        
        req.custom.user = decoded;

        next();
    }
});