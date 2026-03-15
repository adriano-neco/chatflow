import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../lib/auth.js";

const uploadsDir = path.resolve(process.cwd(), "data/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({
    url,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

export default router;
