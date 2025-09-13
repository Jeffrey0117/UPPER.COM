import express from "express";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Get all pages for user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pages = await prisma.page.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        file: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      pages,
    });
  })
);

// Create new page
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      title,
      description,
      content,
      fileId,
      template = "xiyi-download",
      images,
      introImages,
      requireEmail = true,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "標題為必填項目",
      });
    }

    // Generate unique slug with hash for security
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30); // 限制長度

    // 生成8位隨機hash
    const randomHash = Math.random().toString(36).substring(2, 10);
    let slug = `${baseSlug}-${randomHash}`;

    // 確保slug唯一（雖然機率很低，但還是檢查）
    while (await prisma.page.findUnique({ where: { slug } })) {
      const newHash = Math.random().toString(36).substring(2, 10);
      slug = `${baseSlug}-${newHash}`;
    }

    const page = await prisma.page.create({
      data: {
        title,
        description: description || "",
        content: content || "",
        slug,
        template,
        userId: req.user.id,
        fileId: fileId ? parseInt(fileId, 10) : null,
        settings: JSON.stringify({
          theme: "xiyi",
          layout: "default",
          requireEmail: requireEmail === "true",
        }),
        images: images || null,
        introImages: introImages || null,
        isActive: true,
      },
      include: {
        file: true,
      },
    });

    logger.info(`Page created: ${title} (${slug}) by user ${req.user.id}`);

    res.json({
      success: true,
      page,
      downloadUrl: `/download-page/${slug}`,
    });
  })
);

// Update page
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      title,
      description,
      content,
      fileId,
      settings,
      images,
      introImages,
    } = req.body;

    const page = await prisma.page.findUnique({
      where: { id: parseInt(id) },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    if (page.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "無權限編輯此頁面",
      });
    }

    const updatedPage = await prisma.page.update({
      where: { id: parseInt(id) },
      data: {
        title: title || page.title,
        description: description || page.description,
        content: content !== undefined ? content : page.content,
        fileId:
          fileId !== undefined
            ? fileId
              ? parseInt(fileId, 10)
              : null
            : page.fileId,
        settings: settings ? JSON.stringify(settings) : page.settings,
        images: images !== undefined ? images : page.images,
        introImages: introImages !== undefined ? introImages : page.introImages,
      },
      include: {
        file: true,
      },
    });

    res.json({
      success: true,
      page: updatedPage,
    });
  })
);

// Delete page
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const page = await prisma.page.findUnique({
      where: { id: parseInt(id) },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "頁面不存在",
      });
    }

    if (page.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "無權限刪除此頁面",
      });
    }

    await prisma.page.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`Page deleted: ${page.title} by user ${req.user.id}`);

    res.json({
      success: true,
      message: "頁面已刪除",
    });
  })
);

export default router;
