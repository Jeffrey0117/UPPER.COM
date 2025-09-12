import express from "express";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../app.js";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get file content for preview (text files only)
router.get(
  "/content/:fileId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    try {
      // Find the file and verify ownership
      const file = await prisma.file.findFirst({
        where: {
          id: parseInt(fileId),
          userId: req.user.id,
        },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: "檔案不存在或無權限存取",
        });
      }

      // Check if file is text-based
      const extension = path
        .extname(file.originalName)
        .toLowerCase()
        .substring(1);
      const textExtensions = [
        "txt",
        "md",
        "csv",
        "json",
        "html",
        "xml",
        "js",
        "css",
        "log",
        "ini",
        "conf",
      ];
      const supportedExtensions = [...textExtensions, "pdf"];

      if (!supportedExtensions.includes(extension)) {
        return res.status(400).json({
          success: false,
          message: "此檔案類型不支援預覽",
        });
      }

      // Handle PDF files separately
      if (extension === "pdf") {
        // Get file path
        let filePath;

        if (file.isCreated && file.filename) {
          // For created files, use the filename directly
          filePath = path.join("./uploads", file.filename);
        } else if (file.storageKey) {
          // For uploaded files, use storage key
          filePath = path.join("./uploads", file.storageKey);
        } else {
          return res.status(404).json({
            success: false,
            message: "無法找到檔案路径",
          });
        }

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch (error) {
          logger.warn(`File not found: ${filePath}`);
          return res.status(404).json({
            success: false,
            message: "檔案不存在於儲存系統",
          });
        }

        // Serve PDF file
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'inline; filename="' + encodeURIComponent(file.originalName) + '"'
        );
        const pdfContent = await fs.readFile(filePath);
        res.send(pdfContent);

        logger.info(
          `PDF file served: ${file.originalName} (${file.id}) to user ${req.user.id}`
        );
        return;
      }

      // Handle text files
      let filePath;

      if (file.isCreated && file.filename) {
        // For created files, use the filename directly
        filePath = path.join("./uploads", file.filename);
      } else if (file.storageKey) {
        // For uploaded files, use storage key
        filePath = path.join("./uploads", file.storageKey);
      } else {
        return res.status(404).json({
          success: false,
          message: "無法找到檔案路径",
        });
      }

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        logger.warn(`File not found: ${filePath}`);
        return res.status(404).json({
          success: false,
          message: "檔案不存在於儲存系統",
        });
      }

      // Read file content with encoding detection
      let content;
      try {
        // Try UTF-8 first
        content = await fs.readFile(filePath, "utf8");
      } catch (error) {
        // If UTF-8 fails, try with buffer and detect encoding
        try {
          const buffer = await fs.readFile(filePath);
          // Simple check for common Chinese encodings
          if (buffer.includes(0x00)) {
            // Might be UTF-16 or binary
            return res.status(400).json({
              success: false,
              message: "檔案可能包含二進位內容，無法預覽",
            });
          }
          content = buffer.toString("utf8");
        } catch (bufferError) {
          logger.error(`Error reading file ${filePath}:`, bufferError);
          return res.status(500).json({
            success: false,
            message: "無法讀取檔案內容",
          });
        }
      }

      // Limit content size for preview (max 1MB)
      if (content.length > 1024 * 1024) {
        content =
          content.substring(0, 1024 * 1024) +
          "\n\n... (檔案內容過長，已截斷顯示)";
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(content);

      logger.info(
        `File content preview served: ${file.originalName} (${file.id}) to user ${req.user.id}`
      );
    } catch (error) {
      logger.error("Error serving file content:", error);
      res.status(500).json({
        success: false,
        message: "伺服器錯誤",
      });
    }
  })
);

// Get file metadata for enhanced listing
router.get(
  "/metadata/:fileId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    try {
      // Find the file and verify ownership
      const file = await prisma.file.findFirst({
        where: {
          id: parseInt(fileId),
          userId: req.user.id,
        },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: "檔案不存在或無權限存取",
        });
      }

      // Get file stats
      let filePath;
      if (file.isCreated && file.filename) {
        filePath = path.join("./uploads", file.filename);
      } else if (file.storageKey) {
        filePath = path.join("./uploads", file.storageKey);
      } else {
        return res.status(404).json({
          success: false,
          message: "無法找到檔案路径",
        });
      }

      let stats = null;
      try {
        const fileStats = await fs.stat(filePath);
        stats = {
          size: fileStats.size,
          created: fileStats.birthtime,
          modified: fileStats.mtime,
          accessed: fileStats.atime,
        };
      } catch (error) {
        logger.warn(`Could not get file stats for ${filePath}:`, error);
      }

      // Get file type information
      const extension = path
        .extname(file.originalName)
        .toLowerCase()
        .substring(1);
      const typeCategories = {
        image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"],
        document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
        text: ["txt", "md", "csv", "json", "html", "xml", "js", "css"],
        pdf: ["pdf"],
        archive: ["zip", "rar", "tar", "gz", "7z"],
      };

      let fileType = "other";
      for (const [type, extensions] of Object.entries(typeCategories)) {
        if (extensions.includes(extension)) {
          fileType = type;
          break;
        }
      }

      res.json({
        success: true,
        metadata: {
          id: file.id,
          name: file.name,
          originalName: file.originalName,
          extension: extension,
          type: fileType,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          downloads: file.downloads,
          isActive: file.isActive,
          isCreated: file.isCreated,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          downloadUrl: `/download/${file.downloadSlug}`,
          previewable: {
            isImage: typeCategories.image.includes(extension),
            isText: typeCategories.text.includes(extension),
            isDocument: typeCategories.document.includes(extension),
            isPdf: extension === "pdf",
          },
          fileStats: stats,
        },
      });
    } catch (error) {
      logger.error("Error getting file metadata:", error);
      res.status(500).json({
        success: false,
        message: "伺服器錯誤",
      });
    }
  })
);

// Enhanced file listing with search and filter capabilities
router.get(
  "/list",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const {
      search,
      type,
      sortBy = "name",
      sortOrder = "asc",
      limit = 50,
      offset = 0,
    } = req.query;

    try {
      // Build where clause
      let whereClause = {
        userId: req.user.id,
      };

      // Add search filter
      if (search) {
        whereClause.OR = [
          { name: { contains: search } },
          { originalName: { contains: search } },
        ];
      }

      // Add type filter
      if (type && type !== "all") {
        const typeExtensions = {
          image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"],
          document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
          text: ["txt", "md", "csv", "json", "html", "xml", "js", "css"],
          other: ["zip", "rar", "tar", "gz", "7z"],
        };

        if (typeExtensions[type]) {
          // This is a simplified approach - in production you might want to store file type in DB
          // For now, we'll filter on the client side
        }
      }

      // Build order by clause
      const orderByMap = {
        name: "name",
        size: "sizeBytes",
        date: "createdAt",
        downloads: "downloads",
      };

      const orderBy = {};
      orderBy[orderByMap[sortBy] || "name"] =
        sortOrder === "desc" ? "desc" : "asc";

      // Get files
      const files = await prisma.file.findMany({
        where: whereClause,
        orderBy,
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          name: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          downloads: true,
          downloadSlug: true,
          description: true,
          isActive: true,
          isCreated: true,
          storageKey: true,
          filename: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Get total count for pagination
      const totalCount = await prisma.file.count({
        where: whereClause,
      });

      // Enhance files with additional metadata
      const enhancedFiles = files.map((file) => {
        const extension = path
          .extname(file.originalName)
          .toLowerCase()
          .substring(1);

        const typeCategories = {
          image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"],
          document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
          text: ["txt", "md", "csv", "json", "html", "xml", "js", "css"],
          pdf: ["pdf"],
          archive: ["zip", "rar", "tar", "gz", "7z"],
        };

        let fileType = "other";
        for (const [type, extensions] of Object.entries(typeCategories)) {
          if (extensions.includes(extension)) {
            fileType = type;
            break;
          }
        }

        return {
          ...file,
          extension,
          type: fileType,
          downloadUrl: `/download/${file.downloadSlug}`,
          pageUrl: `/download-page/xiyi-download?file=${file.downloadSlug}`,
          previewable: {
            isImage: typeCategories.image.includes(extension),
            isText: typeCategories.text.includes(extension),
            isDocument: typeCategories.document.includes(extension),
            isPdf: extension === "pdf",
          },
        };
      });

      res.json({
        success: true,
        files: enhancedFiles,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit),
        },
      });
    } catch (error) {
      logger.error("Error getting enhanced file list:", error);
      res.status(500).json({
        success: false,
        message: "伺服器錯誤",
        files: [],
      });
    }
  })
);

// Get file statistics
router.get(
  "/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;

      // Get basic file statistics
      const totalFiles = await prisma.file.count({
        where: { userId },
      });

      const totalSize = await prisma.file.aggregate({
        where: { userId },
        _sum: {
          sizeBytes: true,
        },
      });

      const totalDownloads = await prisma.file.aggregate({
        where: { userId },
        _sum: {
          downloads: true,
        },
      });

      // Get file type distribution
      const files = await prisma.file.findMany({
        where: { userId },
        select: {
          originalName: true,
          sizeBytes: true,
        },
      });

      const typeStats = {};
      const typeCategories = {
        image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"],
        document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
        text: ["txt", "md", "csv", "json", "html", "xml", "js", "css"],
        pdf: ["pdf"],
        archive: ["zip", "rar", "tar", "gz", "7z"],
      };

      files.forEach((file) => {
        const extension = path
          .extname(file.originalName)
          .toLowerCase()
          .substring(1);

        let fileType = "other";
        for (const [type, extensions] of Object.entries(typeCategories)) {
          if (extensions.includes(extension)) {
            fileType = type;
            break;
          }
        }

        if (!typeStats[fileType]) {
          typeStats[fileType] = {
            count: 0,
            totalSize: 0,
          };
        }

        typeStats[fileType].count++;
        typeStats[fileType].totalSize += file.sizeBytes;
      });

      res.json({
        success: true,
        stats: {
          totalFiles,
          totalSize: totalSize._sum.sizeBytes || 0,
          totalDownloads: totalDownloads._sum.downloads || 0,
          typeDistribution: typeStats,
          averageFileSize:
            totalFiles > 0
              ? Math.round((totalSize._sum.sizeBytes || 0) / totalFiles)
              : 0,
        },
      });
    } catch (error) {
      logger.error("Error getting file statistics:", error);
      res.status(500).json({
        success: false,
        message: "伺服器錯誤",
      });
    }
  })
);

export default router;
