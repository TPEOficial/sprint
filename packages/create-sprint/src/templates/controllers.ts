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

export function getUploadController(language: string) {
    if (language === "typescript") {
        return `import { Handler, SprintRequest, SprintResponse } from "sprint-es";

export const uploadPdfController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    
    res.json({
        message: "PDF uploaded successfully",
        file: {
            name: file.originalname,
            size: file.size,
            type: file.mimetype
        }
    });
};

export const uploadMultiplePdfsController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const files = req.files?.documents || [];
    
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    
    res.json({
        message: \`\${files.length} PDFs uploaded successfully\`,
        files: files.map((f) => ({
            name: f.originalname,
            size: f.size,
            type: f.mimetype
        }))
    });
};

export const streamUploadController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const files = (req as any).files?.file || [];
    
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    
    res.json({
        message: \`\${files.length} file(s) processed via streaming\`,
        files: files.map((f: any) => ({
            fieldName: f.fieldname,
            filename: f.originalname,
            mimeType: f.mimetype,
            encoding: f.encoding
        }))
    });
};
`;
    }
    return `export const uploadPdfController = (req, res) => {
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    
    res.json({
        message: "PDF uploaded successfully",
        file: {
            name: file.originalname,
            size: file.size,
            type: file.mimetype
        }
    });
};

export const uploadMultiplePdfsController = (req, res) => {
    const files = req.files?.documents || [];
    
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    
    res.json({
        message: \`\${files.length} PDFs uploaded successfully\`,
        files: files.map((f) => ({
            name: f.originalname,
            size: f.size,
            type: f.mimetype
        }))
    });
};

export const streamUploadController = async (req, res, next) => {
    const sprint = req.sprintInstance;
    
    if (!sprint) return res.status(500).json({ error: "Sprint instance not available" });
    
    try {
        const streamParser = sprint.streamUpload({
            limits: { fileSize: 10 * 1024 * 1024 }
        });
        
        const { files, fields } = await streamParser(req, res);
        
        res.json({
            message: \`\${files.length} file(s) processed via streaming\`,
            files: files.map((f) => ({
                fieldName: f.fieldName,
                filename: f.filename,
                mimeType: f.mimeType,
                encoding: f.encoding
            })),
            fields
        });
    } catch (error) {
        return res.status(400).json({ error: "Stream upload failed", details: error });
    }
};
`;
}