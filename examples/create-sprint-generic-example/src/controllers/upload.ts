import { Handler, SprintRequest, SprintResponse } from "sprint-es";

export const uploadPdfController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const file = req.files?.document[0];
    
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    
    return res.json({
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
    
    return res.json({
        message: `${files.length} PDFs uploaded successfully`,
        files: files.map((f: any) => ({
            name: f.originalname,
            size: f.size,
            type: f.mimetype
        }))
    });
};

export const streamUploadController: Handler = (req: SprintRequest, res: SprintResponse) => {
    const files = (req as any).files?.file || [];
    
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    
    return res.json({
        message: `${files.length} file(s) processed via streaming`,
        files: files.map((f: any) => ({
            fieldName: f.fieldname,
            filename: f.originalname,
            mimeType: f.mimetype,
            encoding: f.encoding
        }))
    });
};