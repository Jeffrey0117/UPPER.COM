import express from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { prisma } from "../app.js";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { jsPDF } from "jspdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get file creator page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/file-creator.html"));
});

// Create new file from content
router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const { content, filename, fileType, title, description } = req.body;
    const userId = req.user.id;

    if (!content || !filename || !fileType) {
      return res.status(400).json({
        success: false,
        error: "Content, filename, and fileType are required",
      });
    }

    try {
      let fileBuffer;
      let mimeType;
      let finalFilename = filename;

      // Generate file based on type
      switch (fileType.toLowerCase()) {
        case "txt":
          fileBuffer = Buffer.from(content, "utf8");
          mimeType = "text/plain";
          if (!finalFilename.endsWith(".txt")) {
            finalFilename += ".txt";
          }
          break;

        case "json":
          try {
            // Validate JSON
            JSON.parse(content);
            fileBuffer = Buffer.from(content, "utf8");
            mimeType = "application/json";
            if (!finalFilename.endsWith(".json")) {
              finalFilename += ".json";
            }
          } catch (error) {
            return res.status(400).json({
              success: false,
              error: "Invalid JSON format",
            });
          }
          break;

        case "csv":
          fileBuffer = Buffer.from(content, "utf8");
          mimeType = "text/csv";
          if (!finalFilename.endsWith(".csv")) {
            finalFilename += ".csv";
          }
          break;

        case "html":
          fileBuffer = Buffer.from(content, "utf8");
          mimeType = "text/html";
          if (!finalFilename.endsWith(".html")) {
            finalFilename += ".html";
          }
          break;

        case "xml":
          fileBuffer = Buffer.from(content, "utf8");
          mimeType = "application/xml";
          if (!finalFilename.endsWith(".xml")) {
            finalFilename += ".xml";
          }
          break;

        case "md":
        case "markdown":
          fileBuffer = Buffer.from(content, "utf8");
          mimeType = "text/markdown";
          if (!finalFilename.endsWith(".md")) {
            finalFilename += ".md";
          }
          break;

        case "pdf":
          // Create PDF using jsPDF
          const doc = new jsPDF();
          
          // Split content into lines and add to PDF
          const lines = content.split("\n");
          let yPosition = 20;
          const lineHeight = 10;
          const pageHeight = doc.internal.pageSize.height;
          
          lines.forEach((line) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, 20, yPosition);
            yPosition += lineHeight;
          });
          
          fileBuffer = Buffer.from(doc.output("arraybuffer"));
          mimeType = "application/pdf";
          if (!finalFilename.endsWith(".pdf")) {
            finalFilename += ".pdf";
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            error: "Unsupported file type",
          });
      }

      // Generate unique filename and download slug
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const uniqueFilename = `${timestamp}-${randomString}-${finalFilename}`;
      const downloadSlug = `download-${timestamp}-${randomString}`;
      
      // Save file to uploads directory
      const uploadsDir = path.join(__dirname, "../../uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, uniqueFilename);
      await fs.writeFile(filePath, fileBuffer);

      // Save file record to database
      const file = await prisma.file.create({
        data: {
          name: finalFilename,
          originalName: finalFilename,
          filename: uniqueFilename,
          storageKey: uniqueFilename, // 使用 uniqueFilename 作為 storageKey
          downloadSlug: downloadSlug, // 添加下載 slug
          mimeType,
          sizeBytes: fileBuffer.length,
          userId,
          isCreated: true, // Flag to indicate this was created, not uploaded
        },
      });

      // Create default page for the file
      const page = await prisma.page.create({
        data: {
          title: title || `Download ${finalFilename}`,
          description: description || `Created file: ${finalFilename}`,
          slug: `created-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          fileId: file.id,
          userId,
          isActive: true,
        },
      });

      logger.info(`File created: ${finalFilename} by user ${userId}`);

      res.json({
        success: true,
        message: "File created successfully",
        data: {
          file: {
            id: file.id,
            name: file.name,
            size: file.sizeBytes,
            type: fileType,
          },
          page: {
            id: page.id,
            title: page.title,
            slug: page.slug,
            url: `/share/${page.slug}`,
          },
        },
      });
    } catch (error) {
      logger.error("File creation failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create file",
        details: error.message,
      });
    }
  })
);

// Get user's created files
router.get(
  "/my-files",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      const files = await prisma.file.findMany({
        where: {
          userId,
          isCreated: true,
        },
        include: {
          pages: {
            select: {
              id: true,
              title: true,
              slug: true,
              views: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const filesWithStats = files.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.sizeBytes,
        mimeType: file.mimeType,
        downloads: file.downloads,
        createdAt: file.createdAt,
        pages: file.pages,
        totalViews: file.pages.reduce((sum, page) => sum + page.views, 0),
      }));

      res.json({
        success: true,
        data: filesWithStats,
      });
    } catch (error) {
      logger.error("Failed to get created files:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve created files",
        details: error.message,
      });
    }
  })
);

export default router;
