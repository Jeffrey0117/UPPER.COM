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
      const clientIp = req.ip || req.connection.remoteAddress || "unknown";

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
            lt: tomorrow,
          },
          data: {
            contains: `"fileId":${file.id}`,
          },
        },
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
            isUniqueToday: !existingDownload,
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

        // If no page images, create a file type placeholder based on file extension
        if (images.length === 0) {
          const fileExtension =
            fileInfo && fileInfo.name
              ? fileInfo.name.split(".").pop()?.toLowerCase() || "file"
              : "file";

          // Create CSS-based file type display instead of placeholder image
          images = [`css-file-icon:${fileExtension}`];
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
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
      color: #1f2937;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .nav { 
      background: rgba(255, 255, 255, 0.95); 
      border-bottom: 1px solid #e2e8f0; 
      padding: 20px 40px; 
      margin: -20px -20px 40px -20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-radius: 0;
    }
    .nav-content { max-width: 1200px; margin: 0 auto; }
    .nav-content { display: flex; justify-content: space-between; align-items: center; }
    .logo-container { display: flex; align-items: center; }
    .logo { font-size: 24px; font-weight: bold; color: #1f2937; text-decoration: none; }
    .nav-links { display: flex; gap: 30px; align-items: center; }
    .nav-links a { color: #6b7280; text-decoration: none; transition: color 0.3s ease; }
    .nav-links a:hover { color: #3b82f6; }
    
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .card { 
      background: rgba(248, 250, 252, 0.8); 
      border-radius: 12px; 
      padding: 30px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
    }
    
    /* 輪播容器 - 固定 500x420 */
    .carousel-container { 
      width: 500px; 
      height: 420px; 
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
      border-radius: 8px; 
      cursor: pointer; 
      font-size: 16px; 
      width: 100%;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
    }
    
    .btn:hover { 
      background: #15803d;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(34, 197, 94, 0.6);
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    h1 { font-size: 32px; margin-bottom: 10px; color: #1f2937; }
    .meta { color: #6b7280; margin-bottom: 20px; }
    .description { color: #4b5563; margin-bottom: 30px; }
    
    /* Form styling */
    input[type="text"], input[type="email"] {
      width: 100%; 
      padding: 12px; 
      border: 1px solid #d1d5db; 
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.8);
      color: #1f2937;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    
    input[type="text"]:focus, input[type="email"]:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background: rgba(255, 255, 255, 0.95);
    }
    
    input[type="text"]::placeholder, input[type="email"]::placeholder {
      color: #9ca3af;
    }
    
    label {
      display: block; 
      margin-bottom: 5px; 
      font-weight: bold;
      color: #374151;
    }
    
    /* File Icon Styles */
    .file-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    
    .file-icon {
      width: 280px;
      height: 350px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    }
    
    .file-icon:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    }
    
    .file-icon-extension {
      font-size: 48px;
      font-weight: bold;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    /* Different file type colors */
    .file-icon-txt, .file-icon-file {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    }
    
    .file-icon-pdf {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .file-icon-jpg, .file-icon-jpeg, .file-icon-png, .file-icon-gif, .file-icon-webp {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .file-icon-doc, .file-icon-docx {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    }
    
    .file-icon-xls, .file-icon-xlsx {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .file-icon-ppt, .file-icon-pptx {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .file-icon-zip, .file-icon-rar, .file-icon-7z {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    }
    
    .file-icon-mp4, .file-icon-avi, .file-icon-mov, .file-icon-mkv {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    }
    
    .file-icon-mp3, .file-icon-wav, .file-icon-flac, .file-icon-aac {
      background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
    }
    
    .file-icon-html, .file-icon-css, .file-icon-js, .file-icon-json {
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
    }

    @media (max-width: 768px) {
      .main-grid { grid-template-columns: 1fr; }
      .carousel-container { width: 100%; max-width: 500px; height: 280px; }
      
      .file-icon {
        width: 200px;
        height: 250px;
      }
      
      .file-icon-extension {
        font-size: 32px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <nav class="nav">
      <div class="nav-content">
        <div class="logo-container">
          <img src="/logo.png" alt="UPPER Logo" style="width: 40px; height: 20px; margin-right: 12px; object-fit: contain;">
          <span class="logo-text" style="font-size: 24px; font-weight: bold; color: #1f2937;">Upper</span>
        </div>
        <div class="nav-links">
          <a href="/">首頁</a>
          <a href="/admin.html">管理</a>
          <span class="author-text" style="color: #6b7280; font-size: 14px; margin-left: 20px;">by 西譯社</span>
        </div>
      </div>
    </nav>
    
    <div class="main-grid">
      <div class="card">
        ${
          images && images.length > 0
            ? images.length === 1
              ? images[0].startsWith("css-file-icon:")
                ? `<div class="carousel-container file-icon-container">
                    <div class="file-icon file-icon-${images[0].replace(
                      "css-file-icon:",
                      ""
                    )}">
                      <div class="file-icon-extension">.${images[0]
                        .replace("css-file-icon:", "")
                        .toUpperCase()}</div>
                    </div>
                  </div>`
                : `<div class="carousel-container">
                    <img src="${images[0]}" alt="${pageToRender.title}" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>`
              : `<div class="carousel-container">
                  ${images
                    .map(
                      (img, index) =>
                        `<div class="carousel-slide ${
                          index === 0 ? "active" : ""
                        }">
                          ${
                            img.startsWith("css-file-icon:")
                              ? `<div class="file-icon file-icon-${img.replace(
                                  "css-file-icon:",
                                  ""
                                )}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                <div class="file-icon-extension">.${img
                                  .replace("css-file-icon:", "")
                                  .toUpperCase()}</div>
                              </div>`
                              : `<img src="${img}" alt="${
                                  pageToRender.title
                                } - 圖片 ${index + 1}">`
                          }
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
      
      <div style="display: flex; flex-direction: column; gap: 30px;">
        <!-- Author Card -->
        <div class="card" style="padding: 24px; position: relative;">
          <button onclick="toggleFollow()" id="followBtn" style="position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; transition: all 0.2s ease; padding: 4px;">
            <span id="heartIcon" style="color: #ef4444; font-size: 20px;">♡</span>
          </button>
          <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 16px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; flex-shrink: 0;">
              西
            </div>
            <div style="flex: 1; min-width: 0;">
              <h3 style="font-size: 16px; font-weight: bold; margin: 0 0 4px 0; color: #1f2937;">西譯社</h3>
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">@westtranslation</div>
              <div style="color: #4b5563; font-size: 14px; line-height: 1.5;">
                專業翻譯工作室 📚 提供高品質中英翻譯服務<br>
                ✨ 分享實用語言學習資源和工具<br>
                💡 致力於打造優質的跨語言溝通橋樑
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-around; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #1f2937; font-size: 16px;" id="followersCount">1.2K</div>
              <div style="color: #6b7280; font-size: 12px;">追蹤數</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #1f2937; font-size: 16px;">${
                fileInfo ? fileInfo.downloads : 0
              }</div>
              <div style="color: #6b7280; font-size: 12px;">下載量</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #1f2937; font-size: 16px;">4.8</div>
              <div style="color: #6b7280; font-size: 12px;">評分</div>
            </div>
          </div>
        </div>
        
        <!-- Download Form -->
        <div class="card">
          <h2 style="font-size: 24px; margin-bottom: 20px;">免費下載</h2>
          <form onsubmit="handleDownload(event)">
            <div style="margin-bottom: 15px;">
              <label>姓名 *</label>
              <input type="text" name="name" required>
            </div>
            <div style="margin-bottom: 20px;">
              <label>電子郵件 *</label>
              <input type="email" name="email" required>
            </div>
            <button type="submit" class="btn">立即下載</button>
          </form>
        </div>
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
    
    // Follow functionality
    let isFollowing = false;
    
    function toggleFollow() {
      const followBtn = document.getElementById('followBtn');
      const heartIcon = document.getElementById('heartIcon');
      const followersCount = document.getElementById('followersCount');
      
      isFollowing = !isFollowing;
      
      if (isFollowing) {
        // Following state
        heartIcon.innerHTML = '♥';
        heartIcon.style.color = '#ef4444';
        followersCount.innerHTML = '1.3K';
      } else {
        // Not following state
        heartIcon.innerHTML = '♡';
        heartIcon.style.color = '#ef4444';
        followersCount.innerHTML = '1.2K';
      }
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
