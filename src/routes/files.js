import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// 處理中檔案追蹤機制
const processingFiles = new Map();

// 檔案簽名生成
function generateFileSignature(userId, originalName, size) {
  return `${userId}_${originalName}_${size}`;
}

// 自動清理過期處理標記（10秒後清理）
function cleanupProcessingFile(signature) {
  setTimeout(() => {
    processingFiles.delete(signature);
  }, 10000);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = "./uploads";
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // 解決中文檔名亂碼問題
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    const uniqueName = `${uuidv4()}-${originalName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
      "pdf",
      "doc",
      "docx",
      "txt",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "zip",
    ];
    const fileExt = path.extname(file.originalname).toLowerCase().substring(1);

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${fileExt} not allowed`));
    }
  },
});

// Get all files for authenticated user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    logger.info(`Getting files for user ${req.user.id}`);

    const files = await prisma.file.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        downloads: file.downloads,
        downloadSlug: file.downloadSlug,
        description: file.description,
        content: file.content,
        isActive: file.isActive,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        storageKey: file.storageKey,
        createdAt: file.createdAt,
        downloadUrl: `/download/${file.downloadSlug}`,
        pageUrl: `/download-page/xiyi-download?file=${file.downloadSlug}`,
      })),
    });
  })
);

// Upload new file
router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "未上傳檔案",
      });
    }

    const { name, description, content } = req.body;

    // 修正中文檔名顯示問題
    const originalName = Buffer.from(req.file.originalname, "latin1").toString(
      "utf8"
    );
    const displayName = name || originalName;

    // 生成檔案簽名用於重複檢測
    const fileSignature = generateFileSignature(
      req.user.id,
      originalName,
      req.file.size
    );

    logger.info(
      `檔案上傳請求 - 用戶: ${req.user.id}, 檔案: ${originalName}, 簽名: ${fileSignature}`
    );

    // 檢查是否正在處理相同檔案（優化衝突檢測邏輯）
    if (processingFiles.has(fileSignature)) {
      const processingInfo = processingFiles.get(fileSignature);
      const processingTime = Date.now() - processingInfo.startTime;

      // 如果處理時間超過5秒，認為可能是殭屍進程，允許重新處理
      if (processingTime > 5000) {
        logger.warn(`檔案處理超時，清除處理標記: ${fileSignature}`);
        processingFiles.delete(fileSignature);
      } else {
        // 刪除重複上傳的物理檔案
        try {
          await fs.unlink(path.join("./uploads", req.file.filename));
        } catch (error) {
          logger.warn(`無法刪除重複檔案: ${req.file.filename}`);
        }

        return res.status(409).json({
          success: false,
          message: "檔案正在處理中，請稍後再試",
          code: "PROCESSING",
        });
      }
    }

    // 標記檔案正在處理
    processingFiles.set(fileSignature, {
      userId: req.user.id,
      originalName: originalName,
      startTime: Date.now(),
    });

    // 設定自動清理
    cleanupProcessingFile(fileSignature);

    try {
      // 檢查是否已存在相同的檔案
      const existingFile = await prisma.file.findFirst({
        where: {
          userId: req.user.id,
          originalName: originalName,
          sizeBytes: req.file.size,
        },
      });

      if (existingFile) {
        // 檔案已存在，刪除物理檔案並返回現有檔案資訊
        try {
          await fs.unlink(path.join("./uploads", req.file.filename));
        } catch (error) {
          logger.warn(`無法刪除重複檔案: ${req.file.filename}`);
        }

        // 移除處理標記
        processingFiles.delete(fileSignature);

        return res.json({
          success: true,
          message: "檔案已存在",
          file: {
            id: existingFile.id,
            name: existingFile.name,
            downloadSlug: existingFile.downloadSlug,
            downloadUrl: `/download/${existingFile.downloadSlug}`,
            pageUrl: `/download-page/xiyi-download?file=${existingFile.downloadSlug}`,
          },
        });
      }

      // 創建新檔案記錄
      const downloadSlug = uuidv4();
      const file = await prisma.file.create({
        data: {
          userId: req.user.id,
          name: displayName,
          originalName: originalName,
          storageKey: req.file.filename,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          downloadSlug,
          description: description || null,
          content: content || null,
        },
      });

      // 移除處理標記
      processingFiles.delete(fileSignature);

      logger.info(`檔案上傳成功 - ID: ${file.id}, 用戶: ${req.user.id}`);

      res.json({
        success: true,
        message: "檔案上傳成功",
        file: {
          id: file.id,
          name: file.name,
          downloadSlug: file.downloadSlug,
          downloadUrl: `/download/${file.downloadSlug}`,
          pageUrl: `/download-page/xiyi-download?file=${file.downloadSlug}`,
        },
      });
    } catch (error) {
      // 發生錯誤時移除處理標記
      processingFiles.delete(fileSignature);

      // 清理上傳的檔案
      try {
        await fs.unlink(path.join("./uploads", req.file.filename));
      } catch (cleanupError) {
        logger.warn(`無法清理失敗上傳的檔案: ${req.file.filename}`);
      }

      logger.error(`檔案上傳失敗: ${error.message}`, error);
      throw error;
    }
  })
);

// Get specific file details
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        downloads: file.downloads,
        downloadSlug: file.downloadSlug,
        description: file.description,
        content: file.content,
        isActive: file.isActive,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
        downloadUrl: `/download/${file.downloadSlug}`,
        pageUrl: `/download-page/xiyi-download?file=${file.downloadSlug}`,
      },
    });
  })
);

// Update file
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, content, isActive } = req.body;

    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const updatedFile = await prisma.file.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "File updated successfully",
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        downloadSlug: updatedFile.downloadSlug,
        downloadUrl: `/download/${updatedFile.downloadSlug}`,
        pageUrl: `/download-page/xiyi-download?file=${updatedFile.downloadSlug}`,
      },
    });
  })
);

// Delete file
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Delete physical file
    try {
      await fs.unlink(path.join("./uploads", file.storageKey));
    } catch (error) {
      logger.warn(`Could not delete physical file: ${file.storageKey}`);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`Deleted file ${id} for user ${req.user.id}`);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  })
);

export default router;
