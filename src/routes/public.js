import express from "express";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Demo download endpoint for testing
router.get(
  "/demo-download/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    logger.info(`Demo download triggered for slug: ${slug}`);

    // Create a simple demo file response
    const demoContent = `演示下載 - ${slug}

這是一個演示下載文件。
在實際使用中，這裡會是您上傳的真實文件。

請在管理後台：
1. 建立頁面 
2. 上傳文件
3. 設定頁面與文件的關聯

感謝您的測試！

生成時間：${new Date().toLocaleString("zh-TW")}
頁面 Slug：${slug}
`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="demo-${slug}.txt"`
    );
    res.send(demoContent);
  })
);

// Direct file download endpoint
router.get(
  "/download/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    // Find file by download slug
    const file = await prisma.file.findUnique({
      where: {
        downloadSlug: slug,
      },
    });

    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: "File not found or no longer available",
      });
    }

    const filePath = path.join("./uploads", file.storageKey);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Get client IP for tracking unique downloads
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

      // Check if this IP has downloaded this file today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingDownload = await prisma.analytics.findFirst({
        where: {
          event: "download",
          ipAddress: clientIp,
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          data: {
            contains: `"fileId":${file.id}`
          }
        }
      });

      // Always increment total download counter (for total download tracking)
      await prisma.file.update({
        where: { id: file.id },
        data: { downloads: file.downloads + 1 },
      });

      // Log analytics (every download is recorded)
      await prisma.analytics.create({
        data: {
          userId: file.userId,
          event: "download",
          ipAddress: clientIp,
          data: JSON.stringify({
            fileId: file.id,
            fileName: file.name,
            downloadSlug: slug,
            isUniqueToday: !existingDownload
          }),
        },
      });

      res.download(filePath, file.name, (err) => {
        if (err) {
          logger.error(`Download error: ${err.message}`);
          res.status(500).json({
            success: false,
            message: "Download failed",
          });
        }
      });
    } catch (error) {
      logger.error(`File access error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "File not accessible",
      });
    }
  })
);

// Public download page endpoint
router.get(
  "/download-page/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    try {
      // Find page by slug
      const page = await prisma.page.findUnique({
        where: { slug: slug },
        include: {
          file: true,
        },
      });

      let pageToRender,
        fileInfo,
        images = [];

      if (!page || !page.isActive) {
        // Create a demo page for testing when page not found
        pageToRender = {
          title: `演示頁面 - ${slug}`,
          description:
            "這是一個演示頁面，用於測試。請在管理後台新增真實頁面並上傳圖片。",
          slug: slug,
          images: "[]", // 空的圖片陣列用於測試
        };
        fileInfo = null;

        // Get images from demo page data
        if (pageToRender.images) {
          try {
            images = JSON.parse(pageToRender.images);
          } catch (error) {
            console.log("Error parsing page images:", error);
          }
        }

        // If no page images, show a placeholder
        if (images.length === 0) {
          images = [
            "https://via.placeholder.com/800x500/e5e7eb/9ca3af?text=請在管理後台上傳圖片",
          ];
        }
      } else {
        // Use real page data
        pageToRender = page;
        fileInfo = page.file;

        // Get images from page data
        if (page.images) {
          try {
            images = JSON.parse(page.images);
          } catch (error) {
            console.log("Error parsing page images:", error);
          }
        }

        // If no page images, show a placeholder
        if (images.length === 0) {
          images = [
            "https://via.placeholder.com/800x500/e5e7eb/9ca3af?text=No+Images+Available",
          ];
        }
      }

      res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageToRender.title} - 西譯社</title>
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: Arial, sans-serif; 
      background-color: #f9fafb;
      color: #1f2937;
      line-height: 1.6;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .nav { background: white; border-bottom: 1px solid #e5e7eb; padding: 20px 0; margin-bottom: 40px; }
    .nav-content { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 24px; font-weight: bold; color: #1f2937; text-decoration: none; }
    .nav-links { display: flex; gap: 30px; }
    .nav-links a { color: #6b7280; text-decoration: none; }
    .nav-links a:hover { color: #16a34a; }
    
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    
    /* 輪播容器 - 固定 500x350 */
    .carousel-container { 
      width: 500px; 
      height: 350px; 
      border-radius: 12px; 
      overflow: hidden; 
      position: relative; 
      margin: 0 auto 20px auto;
      background: #f3f4f6;
    }
    
    .carousel-slide { 
      position: absolute; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      opacity: 0; 
      transition: opacity 0.5s ease; 
    }
    
    .carousel-slide.active { opacity: 1; }
    
    .carousel-slide img { 
      width: 100%; 
      height: 100%; 
      object-fit: cover; 
    }
    
    .carousel-nav { 
      position: absolute; 
      top: 50%; 
      transform: translateY(-50%); 
      background: rgba(0,0,0,0.5); 
      color: white; 
      border: none; 
      padding: 10px 15px; 
      cursor: pointer; 
      border-radius: 50%; 
    }
    
    .carousel-nav:hover { background: rgba(0,0,0,0.7); }
    .carousel-prev { left: 10px; }
    .carousel-next { right: 10px; }
    
    .carousel-dots { 
      position: absolute; 
      bottom: 15px; 
      left: 50%; 
      transform: translateX(-50%); 
      display: flex; 
      gap: 8px; 
    }
    
    .carousel-dot { 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
      background: rgba(255,255,255,0.5); 
      border: none; 
      cursor: pointer; 
    }
    
    .carousel-dot.active { background: white; }
    
    .btn { 
      background: #16a34a; 
      color: white; 
      border: none; 
      padding: 12px 24px; 
      border-radius: 6px; 
      cursor: pointer; 
      font-size: 16px; 
      width: 100%; 
    }
    
    .btn:hover { background: #15803d; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    h1 { font-size: 32px; margin-bottom: 10px; }
    .meta { color: #6b7280; margin-bottom: 20px; }
    .description { color: #4b5563; margin-bottom: 30px; }
    
    @media (max-width: 768px) {
      .main-grid { grid-template-columns: 1fr; }
      .carousel-container { width: 100%; max-width: 500px; height: 280px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <nav class="nav">
      <div class="nav-content">
        <a href="/" class="logo">西譯社</a>
        <div class="nav-links">
          <a href="/">首頁</a>
          <a href="/admin.html">管理</a>
        </div>
      </div>
    </nav>
    
    <div class="main-grid">
      <div class="card">
        ${
          images && images.length > 0
            ? images.length === 1
              ? `<div class="carousel-container">
                  <img src="${images[0]}" alt="${pageToRender.title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>`
              : `<div class="carousel-container">
                  ${images
                    .map(
                      (img, index) =>
                        `<div class="carousel-slide ${
                          index === 0 ? "active" : ""
                        }">
                          <img src="${img}" alt="${pageToRender.title} - 圖片 ${
                          index + 1
                        }">
                        </div>`
                    )
                    .join("")}
                  
                  <button class="carousel-nav carousel-prev" onclick="changeSlide(-1)">‹</button>
                  <button class="carousel-nav carousel-next" onclick="changeSlide(1)">›</button>
                  
                  <div class="carousel-dots">
                    ${images
                      .map(
                        (_, index) =>
                          `<button class="carousel-dot ${
                            index === 0 ? "active" : ""
                          }" onclick="goToSlide(${index})"></button>`
                      )
                      .join("")}
                  </div>
                </div>`
            : `<div class="carousel-container" style="display: flex; align-items: center; justify-content: center; color: #9ca3af;">
                <span>產品封面</span>
              </div>`
        }
        
        <h1>${pageToRender.title}</h1>
        <div class="meta">
          ⭐ 5.0 • ${fileInfo ? fileInfo.downloads : 0} 次下載
        </div>
        <div class="description">
          ${pageToRender.description || "免費下載資源，立即獲取實用內容。"}
        </div>
        
        ${
          fileInfo
            ? `<ul style="list-style: disc; padding-left: 20px; margin-bottom: 20px;">
                <li>檔案名稱：${fileInfo.name}</li>
                <li>已下載：${fileInfo.downloads} 次</li>
                <li>格式：PDF（可列印）</li>
              </ul>`
            : ""
        }
      </div>
      
      <div class="card">
        <h2 style="font-size: 24px; margin-bottom: 20px;">免費下載</h2>
        <form onsubmit="handleDownload(event)">
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">姓名 *</label>
            <input type="text" name="name" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">電子郵件 *</label>
            <input type="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
          </div>
          <button type="submit" class="btn">立即下載</button>
        </form>
      </div>
    </div>
  </div>

  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      currentSlide = index;
    }
    
    function changeSlide(direction) {
      const newIndex = (currentSlide + direction + slides.length) % slides.length;
      showSlide(newIndex);
    }
    
    function goToSlide(index) {
      showSlide(index);
    }
    
    // 自動輪播
    if (slides.length > 1) {
      setInterval(() => {
        changeSlide(1);
      }, 5000);
    }
    
    async function handleDownload(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      
      try {
        const response = await fetch('/download-page/${
          pageToRender.slug
        }/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.get('name'),
            email: formData.get('email')
          })
        });
        
        const result = await response.json();
        if (result.success) {
          window.location.href = result.downloadUrl;
        } else {
          alert('下載失敗：' + result.message);
        }
      } catch (error) {
        alert('發生錯誤，請稍後再試');
      }
    }
  </script>
</body>
</html>`);
    } catch (error) {
      logger.error(`Error generating download page: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
);

// Handle form submission
router.post(
  "/download-page/:slug/submit",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { name, email } = req.body;

    try {
      // Find page
      const page = await prisma.page.findUnique({
        where: { slug: slug },
        include: { file: true },
      });

      if (page && page.isActive && page.file) {
        // Real page with file - normal flow
        // Use upsert to handle duplicate email for same page
        await prisma.lead.upsert({
          where: {
            pageId_email: {
              pageId: page.id,
              email: email,
            },
          },
          update: {
            // Update timestamp if lead already exists
          },
          create: {
            email,
            pageId: page.id,
          },
        });

        return res.json({
          success: true,
          downloadUrl: `/download/${page.file.downloadSlug}`,
        });
      } else {
        // Demo page or page without file - create demo download
        logger.info(
          `Demo download request for slug: ${slug}, name: ${name}, email: ${email}`
        );

        // For demo purposes, return a mock download URL or redirect to a sample file
        return res.json({
          success: true,
          downloadUrl: `/demo-download/${slug}`,
          message:
            "This is a demo download. In production, this would link to your actual file.",
        });
      }
    } catch (error) {
      logger.error(`Error processing form submission: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
);

// Public API to get page data by slug
router.get(
  "/api/p/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    try {
      // Find page by slug
      const page = await prisma.page.findUnique({
        where: {
          slug: slug,
        },
        include: {
          file: true,
        },
      });

      if (!page || !page.isActive) {
        return res.status(404).json({
          success: false,
          message: "Page not found",
        });
      }

      // Return page data including images
      res.json({
        success: true,
        id: page.id,
        title: page.title,
        description: page.description,
        slug: page.slug,
        images: page.images,
        template: page.template,
        isActive: page.isActive,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      });
    } catch (error) {
      logger.error(`Error fetching page data: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
);

export { router as publicRouter };
