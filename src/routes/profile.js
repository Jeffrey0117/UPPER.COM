import express from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { prisma } from "../app.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// 獲取當前使用者的個人資料
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        profilePublic: true,
        createdAt: true,
        _count: {
          select: {
            files: { where: { isActive: true } },
            pages: { where: { isActive: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "使用者不存在",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

// 更新使用者個人資料
router.put(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, bio, location, website, company, profilePublic } = req.body;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(bio !== undefined && { bio }),
          ...(location !== undefined && { location }),
          ...(website !== undefined && { website }),
          ...(company !== undefined && { company }),
          ...(profilePublic !== undefined && { profilePublic }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          location: true,
          website: true,
          company: true,
          profilePublic: true,
          createdAt: true,
        },
      });

      logger.info(`User profile updated: ${userId}`);

      res.json({
        success: true,
        message: "個人資料更新成功",
        data: updatedUser,
      });
    } catch (error) {
      logger.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        error: "更新個人資料失敗",
      });
    }
  })
);

// 獲取公開使用者資料 (不需要認證)
router.get(
  "/public/:userId",
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "無效的使用者 ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        profilePublic: true, // 只顯示公開的個人資料
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        createdAt: true,
        files: {
          where: {
            isActive: true,
            isPublic: true, // 只顯示公開的檔案
          },
          select: {
            id: true,
            name: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            downloads: true,
            description: true,
            downloadSlug: true,
            createdAt: true,
            pages: {
              where: { isActive: true },
              select: {
                id: true,
                title: true,
                slug: true,
                views: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            files: { where: { isActive: true, isPublic: true } },
            pages: { where: { isActive: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "使用者不存在或個人資料未公開",
      });
    }

    // 計算總下載次數和總瀏覽次數
    const totalDownloads = user.files.reduce(
      (sum, file) => sum + file.downloads,
      0
    );
    const totalViews = user.files.reduce(
      (sum, file) =>
        sum + file.pages.reduce((pageSum, page) => pageSum + page.views, 0),
      0
    );

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          totalDownloads,
          totalViews,
          publicFiles: user._count.files,
          totalPages: user._count.pages,
        },
      },
    });
  })
);

// 更新檔案的公開狀態
router.put(
  "/files/:fileId/visibility",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const fileId = parseInt(req.params.fileId);
    const { isPublic } = req.body;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "無效的檔案 ID",
      });
    }

    // 檢查檔案是否屬於當前使用者
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "檔案不存在或無權限",
      });
    }

    try {
      const updatedFile = await prisma.file.update({
        where: { id: fileId },
        data: { isPublic: Boolean(isPublic) },
        select: {
          id: true,
          name: true,
          isPublic: true,
        },
      });

      logger.info(
        `File visibility updated: ${fileId} -> ${
          isPublic ? "public" : "private"
        }`
      );

      res.json({
        success: true,
        message: `檔案已設為${isPublic ? "公開" : "私有"}`,
        data: updatedFile,
      });
    } catch (error) {
      logger.error("Update file visibility error:", error);
      res.status(500).json({
        success: false,
        error: "更新檔案可見性失敗",
      });
    }
  })
);

export default router;
