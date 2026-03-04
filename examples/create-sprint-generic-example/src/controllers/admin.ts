import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { signEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const adminController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Admin Dashboard",
        status: "ok"
    });
};

export const adminUsersController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        users: [
            { id: 1, name: "John Doe", role: "admin" },
            { id: 2, name: "Jane Smith", role: "user" }
        ]
    });
};

const { privateKey, encryptionSecret } = getJwtFromEnv();

export const jwtGenerateController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const { userId, role } = req.body || {};
    
    try {
        const payload = { userId, role: role || "user" };
        const token = signEncrypted(payload, privateKey, encryptionSecret, { expiresIn: "1h" });
        res.json({ token });
    } catch (error) {
        return res.status(500).json({ error: "JWT not configured" });
    }
};