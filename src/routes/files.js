import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

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
        isActive: file.isActive,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
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
        message: "No file uploaded",
      });
    }

    const { name, description } = req.body;
    const downloadSlug = uuidv4();

    // 修正中文檔名顯示問題
    const originalName = Buffer.from(req.file.originalname, "latin1").toString(
      "utf8"
    );
    const displayName = name || originalName;

    logger.info(`File upload by user ${req.user.id}: ${originalName}`);

    // 檢查是否已存在相同的檔案（防止重複上傳）
    const existingFile = await prisma.file.findFirst({
      where: {
        userId: req.user.id,
        originalName: originalName,
        sizeBytes: req.file.size,
        createdAt: {
          gte: new Date(Date.now() - 5000), // 5秒內的相同檔案視為重複
        },
      },
    });

    if (existingFile) {
      // 如果檔案重複，刪除剛上傳的物理檔案並返回現有檔案資訊
      try {
        await fs.unlink(path.join("./uploads", req.file.filename));
      } catch (error) {
        logger.warn(`Could not delete duplicate file: ${req.file.filename}`);
      }

      return res.json({
        success: true,
        message: "File already exists",
        file: {
          id: existingFile.id,
          name: existingFile.name,
          downloadSlug: existingFile.downloadSlug,
          downloadUrl: `/download/${existingFile.downloadSlug}`,
          pageUrl: `/download-page/xiyi-download?file=${existingFile.downloadSlug}`,
        },
      });
    }

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
      },
    });

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        id: file.id,
        name: file.name,
        downloadSlug: file.downloadSlug,
        downloadUrl: `/download/${file.downloadSlug}`,
        pageUrl: `/download-page/xiyi-download?file=${file.downloadSlug}`,
      },
    });
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
    const { name, description, isActive } = req.body;

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
