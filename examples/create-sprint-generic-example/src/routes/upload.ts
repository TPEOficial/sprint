import { Router } from "sprint-es";
import { uploadPdfSchema, uploadMultiplePdfsSchema, streamUploadSchema } from "@/schemas/upload";
import { uploadPdfController, uploadMultiplePdfsController, streamUploadController } from "@/controllers/upload";

const router = Router();

router.post("/pdf", uploadPdfSchema, uploadPdfController);
router.post("/pdfs", uploadMultiplePdfsSchema, uploadMultiplePdfsController);
router.post("/stream", streamUploadSchema, streamUploadController);

export default router;