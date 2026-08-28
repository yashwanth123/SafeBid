import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth";

const dir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    if (!ok) {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadsRouter = Router();

uploadsRouter.post("/", requireAuth, upload.array("files", 6), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const urls = files.map((f) => `/uploads/${f.filename}`);
  res.status(201).json({ urls });
});
