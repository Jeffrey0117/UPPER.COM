import express from "express";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get all files associated with a page
router.get(
  "/:pageId",
  asyncHandler(async (req, res) => {
    const { pageId } = req.params;

    const page = await prisma.page.findFirst({
      where: {
        id: parseInt(pageId),
        userId: req.user.id,
      },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    const pageFiles = await prisma.pageFile.findMany({
      where: {
        pageId: parseInt(pageId),
      },
      include: {
        file: true,
      },
      orderBy: {
        position: "asc",
      },
    });

    res.json({
      success: true,
      pageFiles: pageFiles.map((pf) => ({
        id: pf.id,
        position: pf.position,
        isPrimary: pf.isPrimary,
        file: {
          id: pf.file.id,
          name: pf.file.name,
          originalName: pf.file.originalName,
          downloads: pf.file.downloads,
          downloadSlug: pf.file.downloadSlug,
          description: pf.file.description,
          sizeBytes: pf.file.sizeBytes,
          mimeType: pf.file.mimeType,
          downloadUrl: `/download/${pf.file.downloadSlug}`,
        },
      })),
    });
  })
);

// Associate files with a page (supports multiple files)
router.post(
  "/:pageId/files",
  asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const { fileIds } = req.body; // Array of file IDs

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "請提供檔案ID陣列",
      });
    }

    const page = await prisma.page.findFirst({
      where: {
        id: parseInt(pageId),
        userId: req.user.id,
      },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    // Verify all files belong to the user
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds.map((id) => parseInt(id)) },
        userId: req.user.id,
        isActive: true,
      },
    });

    if (files.length !== fileIds.length) {
      return res.status(400).json({
        success: false,
        message: "部分檔案不存在或無權限",
      });
    }

    // Remove existing associations
    await prisma.pageFile.deleteMany({
      where: {
        pageId: parseInt(pageId),
      },
    });

    // Create new associations
    const pageFiles = await Promise.all(
      fileIds.map(async (fileId, index) => {
        return prisma.pageFile.create({
          data: {
            pageId: parseInt(pageId),
            fileId: parseInt(fileId),
            position: index,
            isPrimary: index === 0, // First file is primary
          },
          include: {
            file: true,
          },
        });
      })
    );

    logger.info(
      `Associated ${fileIds.length} files with page ${pageId} for user ${req.user.id}`
    );

    res.json({
      success: true,
      message: `成功關聯 ${fileIds.length} 個檔案`,
      pageFiles: pageFiles.map((pf) => ({
        id: pf.id,
        position: pf.position,
        isPrimary: pf.isPrimary,
        file: {
          id: pf.file.id,
          name: pf.file.name,
          originalName: pf.file.originalName,
          downloads: pf.file.downloads,
          downloadSlug: pf.file.downloadSlug,
          description: pf.file.description,
          sizeBytes: pf.file.sizeBytes,
          mimeType: pf.file.mimeType,
          downloadUrl: `/download/${pf.file.downloadSlug}`,
        },
      })),
    });
  })
);

// Add a single file to a page
router.post(
  "/:pageId/files/:fileId",
  asyncHandler(async (req, res) => {
    const { pageId, fileId } = req.params;
    const { position, isPrimary = false } = req.body;

    const page = await prisma.page.findFirst({
      where: {
        id: parseInt(pageId),
        userId: req.user.id,
      },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(fileId),
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "檔案不存在",
      });
    }

    // Check if association already exists
    const existingAssociation = await prisma.pageFile.findUnique({
      where: {
        pageId_fileId: {
          pageId: parseInt(pageId),
          fileId: parseInt(fileId),
        },
      },
    });

    if (existingAssociation) {
      return res.status(409).json({
        success: false,
        message: "檔案已經關聯到此頁面",
      });
    }

    // Get current max position
    const maxPosition = await prisma.pageFile.aggregate({
      where: { pageId: parseInt(pageId) },
      _max: { position: true },
    });

    const newPosition =
      position !== undefined ? position : (maxPosition._max.position || 0) + 1;

    // If setting as primary, remove primary flag from others
    if (isPrimary) {
      await prisma.pageFile.updateMany({
        where: {
          pageId: parseInt(pageId),
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const pageFile = await prisma.pageFile.create({
      data: {
        pageId: parseInt(pageId),
        fileId: parseInt(fileId),
        position: newPosition,
        isPrimary,
      },
      include: {
        file: true,
      },
    });

    logger.info(
      `Added file ${fileId} to page ${pageId} for user ${req.user.id}`
    );

    res.json({
      success: true,
      message: "檔案關聯成功",
      pageFile: {
        id: pageFile.id,
        position: pageFile.position,
        isPrimary: pageFile.isPrimary,
        file: {
          id: pageFile.file.id,
          name: pageFile.file.name,
          originalName: pageFile.file.originalName,
          downloads: pageFile.file.downloads,
          downloadSlug: pageFile.file.downloadSlug,
          description: pageFile.file.description,
          sizeBytes: pageFile.file.sizeBytes,
          mimeType: pageFile.file.mimeType,
          downloadUrl: `/download/${pageFile.file.downloadSlug}`,
        },
      },
    });
  })
);

// Remove file from page
router.delete(
  "/:pageId/files/:fileId",
  asyncHandler(async (req, res) => {
    const { pageId, fileId } = req.params;

    const page = await prisma.page.findFirst({
      where: {
        id: parseInt(pageId),
        userId: req.user.id,
      },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    const pageFile = await prisma.pageFile.findUnique({
      where: {
        pageId_fileId: {
          pageId: parseInt(pageId),
          fileId: parseInt(fileId),
        },
      },
    });

    if (!pageFile) {
      return res.status(404).json({
        success: false,
        message: "檔案未關聯到此頁面",
      });
    }

    await prisma.pageFile.delete({
      where: {
        id: pageFile.id,
      },
    });

    logger.info(
      `Removed file ${fileId} from page ${pageId} for user ${req.user.id}`
    );

    res.json({
      success: true,
      message: "檔案取消關聯成功",
    });
  })
);

// Update file position or primary status
router.put(
  "/:pageId/files/:fileId",
  asyncHandler(async (req, res) => {
    const { pageId, fileId } = req.params;
    const { position, isPrimary } = req.body;

    const page = await prisma.page.findFirst({
      where: {
        id: parseInt(pageId),
        userId: req.user.id,
      },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    const pageFile = await prisma.pageFile.findUnique({
      where: {
        pageId_fileId: {
          pageId: parseInt(pageId),
          fileId: parseInt(fileId),
        },
      },
      include: {
        file: true,
      },
    });

    if (!pageFile) {
      return res.status(404).json({
        success: false,
        message: "檔案未關聯到此頁面",
      });
    }

    // If setting as primary, remove primary flag from others
    if (isPrimary === true) {
      await prisma.pageFile.updateMany({
        where: {
          pageId: parseInt(pageId),
          isPrimary: true,
          id: { not: pageFile.id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const updatedPageFile = await prisma.pageFile.update({
      where: {
        id: pageFile.id,
      },
      data: {
        ...(position !== undefined && { position }),
        ...(isPrimary !== undefined && { isPrimary }),
      },
      include: {
        file: true,
      },
    });

    logger.info(
      `Updated file ${fileId} association for page ${pageId} for user ${req.user.id}`
    );

    res.json({
      success: true,
      message: "檔案關聯設定更新成功",
      pageFile: {
        id: updatedPageFile.id,
        position: updatedPageFile.position,
        isPrimary: updatedPageFile.isPrimary,
        file: {
          id: updatedPageFile.file.id,
          name: updatedPageFile.file.name,
          originalName: updatedPageFile.file.originalName,
          downloads: updatedPageFile.file.downloads,
          downloadSlug: updatedPageFile.file.downloadSlug,
          description: updatedPageFile.file.description,
          sizeBytes: updatedPageFile.file.sizeBytes,
          mimeType: updatedPageFile.file.mimeType,
          downloadUrl: `/download/${updatedPageFile.file.downloadSlug}`,
        },
      },
    });
  })
);

export default router;
