import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../lib/auth.js";
import { uploadFile } from "../lib/storage.js";
import { logger } from "../lib/logger.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  try {
    const url = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    logger.info("File uploaded", { name: req.file.originalname, size: req.file.size, url });
    res.json({ url, name: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype });
  } catch (err) {
    logger.error("File upload failed", { error: String(err) });
    res.status(500).json({ error: "Falha ao fazer upload do arquivo" });
  }
});

export default router;
