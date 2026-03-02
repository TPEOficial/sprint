export function getHomeController(language: string) {
    if (language === "typescript") {
        return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const homeController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};

export const jwtValidateController: Handler = (req: SprintRequest, res: SprintResponse) => {
    return res.json(req.custom.user);
};
`;
    }
    return `export const homeController = (req, res) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};

export const jwtValidateController = (req, res) => {
    return res.json(req.custom.user);
};
`;
};

export function getAdminController(language: string) {
    if (language === "typescript") {
        return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";
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
`;
    } else {
        return `import { signEncrypted } from "sprint-es/jwt";

const privateKey = process.env.JWT_PRIVATE_KEY;
const encryptionSecret = process.env.JWT_ENCRYPTION_SECRET;

export const adminController = (req, res) => {
    res.json({
        message: "Admin Dashboard",
        status: "ok"
    });
};

export const adminUsersController = (req, res) => {
    res.json({
        users: [
            { id: 1, name: "John Doe", role: "admin" },
            { id: 2, name: "Jane Smith", role: "user" }
        ]
    });
};

export const jwtGenerateController = (req, res) => {
    const { userId, role } = req.body || {};
    
    try {
        const payload = { userId, role: role || "user" };
        const token = signEncrypted(payload, privateKey, encryptionSecret, { expiresIn: "1h" });
        res.json({ token });
    } catch (error) {
        return res.status(500).json({ error: "JWT not configured" });
    }
};
`;
    }
};