import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 設置圖片上傳目錄
const imagesDir = path.join(process.cwd(), "uploads", "images");

// 確保上傳目錄存在
async function ensureImagesDirExists() {
  try {
    await fs.access(imagesDir);
  } catch {
    await fs.mkdir(imagesDir, { recursive: true });
  }
}

// 配置 multer 存儲
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureImagesDirExists();
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  },
});

// 文件過濾器，只允許圖片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("只允許上傳圖片文件（JPEG, JPG, PNG, GIF, WebP）"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
  },
  fileFilter: fileFilter,
});

// 上傳多張圖片
router.post(
  "/upload-images",
  authenticateToken,
  upload.array("images", 10), // 最多10張圖片
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "請選擇要上傳的圖片",
      });
    }

    // 生成圖片URL
    const imageUrls = req.files.map((file) => {
      return `/uploads/images/${file.filename}`;
    });

    res.json({
      success: true,
      message: `成功上傳 ${req.files.length} 張圖片`,
      urls: imageUrls,
      files: req.files.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        url: `/uploads/images/${file.filename}`,
      })),
    });
  })
);

// 刪除圖片
router.delete(
  "/images/:filename",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(imagesDir, filename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);

      res.json({
        success: true,
        message: "圖片刪除成功",
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          message: "圖片不存在",
        });
      }
      throw error;
    }
  })
);

export default router;
