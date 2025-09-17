import express from "express";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../app.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// 輔助函數：處理頁面圖片數據
function processPageImages(page, fileInfo) {
  let images = [];

  // 優先使用頁面圖片
  if (page.images) {
    try {
      images = JSON.parse(page.images);
    } catch (error) {
      console.log("解析頁面圖片失敗:", error);
    }
  }

  // 如果沒有頁面圖片且有檔案資訊，創建檔案類型圖示
  if (images.length === 0 && fileInfo) {
    let fileExtension =
      fileInfo.name?.split(".").pop()?.toLowerCase() || "file";
    images = [`css-file-icon:${fileExtension}`];
  }

  // 如果仍然沒有圖片，使用通用檔案圖示
  if (images.length === 0) {
    images = [`css-file-icon:file`];
  }

  return images;
}

// 輔助函數：生成檔案類型展示HTML
function generateFileIconHtml(images) {
  if (!images || images.length === 0) {
    return `<div class="image-gallery">
             <div class="main-image-container" style="display: flex; align-items: center; justify-content: center; color: #9ca3af;">
               <span>產品封面</span>
             </div>
           </div>`;
  }

  if (images.length === 1) {
    const image = images[0];
    if (image.startsWith("css-file-icon:")) {
      const fileType = image.replace("css-file-icon:", "");
      return `<div class="image-gallery">
               <div class="main-image-container file-icon-container">
                 <div class="file-icon file-icon-${fileType}">
                   <div class="file-icon-extension">.${fileType.toUpperCase()}</div>
                 </div>
               </div>
             </div>`;
    } else {
      return `<div class="image-gallery">
               <div class="main-image-container">
                 <img src="${image}" alt="產品圖片" class="main-image">
               </div>
             </div>`;
    }
  }

  // 多圖片情況
  return `<div class="image-gallery">
           <div class="main-image-container">
             ${
               images[0].startsWith("css-file-icon:")
                 ? `<div class="file-icon file-icon-${images[0].replace(
                     "css-file-icon:",
                     ""
                   )}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                   <div class="file-icon-extension">.${images[0]
                     .replace("css-file-icon:", "")
                     .toUpperCase()}</div>
                 </div>`
                 : `<img src="${images[0]}" alt="產品圖片 1" class="main-image" id="mainImage">`
             }
           </div>

           <div class="thumbnail-container">
             <button class="thumbnail-nav prev" onclick="scrollThumbnails(-1)" id="prevBtn">‹</button>

             <div class="thumbnail-wrapper">
               <div class="thumbnail-track" id="thumbnailTrack">
                 ${images
                   .map(
                     (img, index) =>
                       `<div class="thumbnail ${
                         index === 0 ? "active" : ""
                       }" onclick="changeMainImage(${index})">
                     ${
                       img.startsWith("css-file-icon:")
                         ? `<div class="file-icon file-icon-${img.replace(
                             "css-file-icon:",
                             ""
                           )}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                           .${img.replace("css-file-icon:", "").toUpperCase()}
                         </div>`
                         : `<img src="${img}" alt="縮圖 ${index + 1}">`
                     }
                   </div>`
                   )
                   .join("")}
               </div>
             </div>

             <button class="thumbnail-nav next" onclick="scrollThumbnails(1)" id="nextBtn">›</button>
           </div>
         </div>`;
}

// 演示下載端點 - 用於測試下載功能
router.get(
  "/demo-download/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    logger.info(`演示下載被觸發，slug: ${slug}`);

    // 生成演示下載內容
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

// 檔案直接下載端點
router.get(
  "/download/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    // 根據下載 slug 查找檔案
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

    // 處理創建的檔案（沒有實際檔案）
    if (file.isCreated && !file.storageKey) {
      // 為創建的檔案生成演示內容
      let demoContent = "";
      const extension = file.name.split(".").pop()?.toLowerCase();

      switch (extension) {
        case "pdf":
          return res.status(200).json({
            success: false,
            message: "此為演示檔案，實際使用中會是真實的PDF檔案",
          });
        case "mp4":
          return res.status(200).json({
            success: false,
            message: "此為演示檔案，實際使用中會是真實的影片檔案",
          });
        case "md":
          demoContent = `# ${file.name}\n\n這是一個演示的 Markdown 檔案。\n\n## 內容簡介\n${file.description}\n\n在實際使用中，這裡會是真實的內容。`;
          break;
        case "html":
          demoContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .demo-note { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>${file.name}</h1>
    <div class="demo-note">
        <strong>演示內容</strong><br>
        ${file.description}
    </div>
    <p>這是一個演示的 HTML 檔案。在實際使用中，這裡會是真實的互動內容。</p>
</body>
</html>`;
          break;
        default:
          demoContent = `演示內容 - ${file.name}\n\n${file.description}\n\n這是一個演示檔案，在實際使用中會是真實的檔案內容。`;
      }

      const mimeType =
        extension === "html"
          ? "text/html"
          : extension === "md"
          ? "text/markdown"
          : "text/plain";

      res.setHeader("Content-Type", `${mimeType}; charset=utf-8`);

      // 對於 HTML 和 Markdown，直接在瀏覽器中顯示，不設置下載 header
      if (extension === "html" || extension === "md") {
        return res.send(demoContent);
      } else {
        // 其他格式設置為下載
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(file.name)}"`
        );
        return res.send(demoContent);
      }
    }

    if (!file.storageKey) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const filePath = path.join("./uploads", file.storageKey);

    try {
      // 檢查檔案是否存在
      await fs.access(filePath);

      // 獲取客戶端 IP 用於追蹤唯一下載
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
          user: true,
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
          let fileExtension = "file";

          if (fileInfo && fileInfo.name) {
            // 如果有檔案資訊，使用檔案名稱推斷類型
            fileExtension =
              fileInfo.name.split(".").pop()?.toLowerCase() || "file";
          } else {
            // 如果頁面存在但沒有檔案資訊，嘗試從頁面標題或slug中推斷檔案類型
            const title = pageToRender.title || "";
            const slugLower = slug.toLowerCase();

            // 優先從標題中檢查檔案附檔名
            if (title.includes(".pdf")) {
              fileExtension = "pdf";
            } else if (title.includes(".json")) {
              fileExtension = "json";
            } else if (title.includes(".doc") || title.includes(".docx")) {
              fileExtension = "doc";
            } else if (title.includes(".xls") || title.includes(".xlsx")) {
              fileExtension = "xls";
            } else if (title.includes(".ppt") || title.includes(".pptx")) {
              fileExtension = "ppt";
            } else if (title.includes(".mp4") || title.includes(".avi")) {
              fileExtension = "mp4";
            } else if (title.includes(".mp3") || title.includes(".wav")) {
              fileExtension = "mp3";
            } else if (title.includes(".txt")) {
              fileExtension = "txt";
            } else if (title.includes(".zip") || title.includes(".rar")) {
              fileExtension = "zip";
            } else if (title.includes(".html")) {
              fileExtension = "html";
            } else if (title.includes(".css")) {
              fileExtension = "css";
            } else if (title.includes(".js")) {
              fileExtension = "js";
            }
            // 如果標題中沒有附檔名，再從關鍵字推斷
            else if (title.toLowerCase().includes("pdf")) {
              fileExtension = "pdf";
            } else if (title.toLowerCase().includes("json")) {
              fileExtension = "json";
            } else if (
              title.toLowerCase().includes("doc") ||
              title.toLowerCase().includes("word")
            ) {
              fileExtension = "doc";
            } else if (
              title.toLowerCase().includes("excel") ||
              title.toLowerCase().includes("xls")
            ) {
              fileExtension = "xls";
            } else if (
              title.toLowerCase().includes("ppt") ||
              title.toLowerCase().includes("powerpoint")
            ) {
              fileExtension = "ppt";
            } else if (
              title.toLowerCase().includes("video") ||
              title.toLowerCase().includes("mp4")
            ) {
              fileExtension = "mp4";
            } else if (
              title.toLowerCase().includes("audio") ||
              title.toLowerCase().includes("mp3")
            ) {
              fileExtension = "mp3";
            } else if (
              title.toLowerCase().includes("text") ||
              title.toLowerCase().includes("txt")
            ) {
              fileExtension = "txt";
            }
            // 最後再從 slug 中檢查一般的檔案類型關鍵字（不包含特殊識別符）
            else if (slugLower.includes("pdf")) {
              fileExtension = "pdf";
            } else if (slugLower.includes("json")) {
              fileExtension = "json";
            } else if (
              slugLower.includes("doc") ||
              slugLower.includes("word")
            ) {
              fileExtension = "doc";
            } else if (
              slugLower.includes("excel") ||
              slugLower.includes("xls")
            ) {
              fileExtension = "xls";
            } else if (
              slugLower.includes("video") ||
              slugLower.includes("mp4")
            ) {
              fileExtension = "mp4";
            } else if (
              slugLower.includes("audio") ||
              slugLower.includes("mp3")
            ) {
              fileExtension = "mp3";
            } else {
              // 預設顯示通用檔案圖示
              fileExtension = "file"; // 在沒有明確資訊的情況下，顯示通用檔案圖示
            }
          }

          // Create CSS-based file type display instead of placeholder image
          images = [`css-file-icon:${fileExtension}`];
        }
      } else {
        // Use real page data
        pageToRender = page;
        fileInfo = page.file;

        // 使用輔助函數處理圖片數據
        images = processPageImages(page, page.file);
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
      background: #F0F4F8;
      color: #1f2937;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .nav {
      background: rgba(255, 255, 255, 0.95);
      border-bottom: 1px solid #e2e8f0;
      padding: 20px 40px;
      margin: 0;
      backdrop-filter: blur(10px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-radius: 0;
      width: 100%;
    }
    .nav-content { max-width: 1200px; margin: 0 auto; }
    .nav-content { display: flex; justify-content: space-between; align-items: center; }
    .logo-container { display: flex; align-items: center; }
    .logo { font-size: 24px; font-weight: bold; color: #1f2937; text-decoration: none; }
    .nav-links { display: flex; gap: 30px; align-items: center; }
    .nav-links a { color: #6b7280; text-decoration: none; transition: color 0.3s ease; }
    .nav-links a:hover { color: #3b82f6; }
    
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: start;
      margin-bottom: 40px;
    }
    .card {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
    }

    /* 右側卡片容器 - 靜態布局 */
    .right-cards-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* 資訊卡片樣式 */
    .info-card {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
    }

    /* 下載卡片樣式 */
    .download-card {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
    }
    
    /* 圖片展示區域 - 上大圖下小圖結構 */
    .image-gallery {
      width: 500px;
      margin: 0 auto 20px auto;
    }
    
    /* 主要大圖區域 */
    .main-image-container {
      width: 100%;
      height: 450px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      margin-bottom: 16px;
      background: #f3f4f6;
    }
    
    .main-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease;
    }
    
    /* 縮圖區域 */
    .thumbnail-container {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .thumbnail-wrapper {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
    }
    
    .thumbnail-track {
      display: flex;
      gap: 8px;
      transition: transform 0.3s ease;
      width: max-content;
    }
    
    .thumbnail {
      width: 80px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    
    .thumbnail.active {
      border-color: #3b82f6;
      transform: scale(1.05);
    }
    
    .thumbnail:hover {
      border-color: #93c5fd;
      transform: scale(1.02);
    }
    
    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    /* 左右切換按鈕 */
    .thumbnail-nav {
      background: rgba(0,0,0,0.6);
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    
    .thumbnail-nav:hover {
      background: rgba(0,0,0,0.8);
      transform: scale(1.1);
    }
    
    .thumbnail-nav:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      transform: none;
    }
    
    .thumbnail-nav.prev { margin-right: 8px; }
    .thumbnail-nav.next { margin-left: 8px; }
    
    /* 檔案圖示容器適配 */
    .file-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      width: 100%;
      height: 100%;
    }
    
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
      background: #F2F2F2;
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

    /* 下載按鈕動畫效果 */
    @keyframes pulse-shadow {
      0%, 100% {
        box-shadow:
          0 4px 15px rgba(16, 185, 129, 0.4),
          0 0 0 0 rgba(16, 185, 129, 0.4);
      }
      50% {
        box-shadow:
          0 4px 15px rgba(16, 185, 129, 0.4),
          0 0 0 8px rgba(16, 185, 129, 0);
      }
    }

    @keyframes icon-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(2px); }
    }

    .download-btn:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
      transform: translateY(-2px);
      box-shadow:
        0 6px 20px rgba(16, 185, 129, 0.6),
        0 0 0 10px rgba(16, 185, 129, 0.1) !important;
      animation: none !important;
    }

    .download-btn:hover svg {
      animation: icon-bounce 0.6s ease-in-out !important;
    }


    @media (max-width: 768px) {
      .main-grid { grid-template-columns: 1fr; }
      .main-image-container { height: 300px; }

      .file-icon {
        width: 200px;
        height: 250px;
      }

      .file-icon-extension {
        font-size: 32px;
      }

      .image-gallery {
        width: 100%;
        max-width: 500px;
        margin: 0 auto 20px auto;
      }

      /* 手機端保持靜態布局 */
      @media (max-width: 768px) {
        .right-cards-container {
          gap: 16px;
        }

        .info-card, .download-card {
          padding: 24px;
        }
      }

      /* 作者資訊區域手機端樣式 */
      .author-info-card {
        flex-direction: column;
        text-align: center;
        gap: 16px;
      }

      .author-avatar {
        width: 80px !important;
        height: 80px !important;
      }

      .author-info-section {
        width: 100% !important;
      }

      .author-buttons {
        flex-direction: column;
        gap: 10px;
      }

      .author-buttons button {
        width: 100% !important;
        padding: 12px !important;
      }
    }
    
    /* 左側區域容器 */
    .left-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* 圓形按鈕功能區域樣式 - 加入卡片背景 */
    .action-buttons-circle {
      margin-top: 20px;
    }

    /* 單一卡片版本 - 所有按鈕在同一張卡片內 */
    .action-card-single {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
    }

    /* 分離卡片版本 - 每個按鈕獨立卡片 */
    .action-cards-separate {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .action-card-individual {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .action-card-individual:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: #3b82f6;
    }

    /* 按鈕組容器 - 水平flex布局 */
    .circle-btn-group {
      display: flex;
      justify-content: space-around;
      align-items: center;
      gap: 40px;
    }

    /* 單個按鈕項目容器 */
    .circle-btn-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    /* 圓形按鈕基礎樣式 - 加大尺寸 */
    .circle-btn {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }

    /* 按鈕圖標容器 - 加大圖標 */
    .circle-btn .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      transition: transform 0.3s ease;
      color: white;
    }

    .circle-btn .btn-icon svg {
      width: 32px;
      height: 32px;
    }

    /* 按鈕標籤 - 加大字體 */
    .btn-label {
      font-size: 15px;
      color: #374151;
      font-weight: 600;
      text-align: center;
      transition: color 0.3s ease;
    }

    /* 線上閱讀按鈕 */
    .btn-read {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .btn-read:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
    }

    /* 收藏按鈕 */
    .btn-favorite {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .btn-favorite:hover {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);
    }

    .btn-favorite.favorited {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    /* 分享按鈕 */
    .btn-share {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    }

    .btn-share:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
    }

    /* 按鈕懸停時的圖標動畫 */
    .circle-btn:hover .btn-icon {
      transform: scale(1.1);
    }

    /* 懸停時標籤顏色變化 */
    .circle-btn-item:hover .btn-label {
      color: #1f2937;
      font-weight: 600;
    }

    /* 按鈕點擊波紋效果 */
    .circle-btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .circle-btn:active::before {
      width: 120px;
      height: 120px;
    }

    .circle-btn:active {
      transform: translateY(-1px);
    }

    /* 載入狀態 */
    .circle-btn.loading {
      pointer-events: none;
      opacity: 0.7;
    }

    .circle-btn.loading .btn-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* 波紋動畫 */
    @keyframes rippleAnimation {
      from {
        transform: scale(0);
        opacity: 1;
      }
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    /* 禁用狀態 */
    .circle-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      background: #e5e7eb !important;
    }

    /* 焦點狀態（無障礙性） */
    .circle-btn:focus {
      outline: none;
      box-shadow:
        0 0 0 3px rgba(59, 130, 246, 0.1),
        0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .circle-btn:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* 輪播導航按鈕樣式增強 */
    .carousel-nav-btn:hover {
      background: rgba(0,0,0,0.8) !important;
      transform: scale(1.1);
    }
    
    .carousel-nav-btn:disabled {
      opacity: 0.3 !important;
      cursor: not-allowed !important;
      transform: none !important;
    }
    
    /* 產品卡片懸停效果增強 */
    .product-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
      border-color: #3b82f6 !important;
    }
    
    /* 輪播指示器樣式增強 */
    .carousel-dot:hover {
      transform: scale(1.2);
    }
    
    .carousel-dot.active {
      transform: scale(1.2);
    }

    @media (max-width: 768px) {
      .main-grid { grid-template-columns: 1fr; }
      .main-image-container { height: 300px; }
      
      .file-icon {
        width: 200px;
        height: 250px;
      }
      
      .file-icon-extension {
        font-size: 32px;
      }
      
      .image-gallery {
        width: 100%;
        max-width: 500px;
        margin: 0 auto 20px auto;
      }
      
      /* 圓形按鈕響應式調整 */
      .circle-btn-group {
        gap: 20px;
      }
      
      .circle-btn {
        width: 70px;
        height: 70px;
      }
      
      .btn-label {
        font-size: 14px;
      }
      
      .circle-btn .btn-icon svg {
        width: 28px;
        height: 28px;
      }

      /* 手機端分離卡片改為垂直排列 */
      .action-cards-separate {
        grid-template-columns: 1fr;
      }
    }

    /* 手機設備 - 圓形按鈕調整 */
    @media (max-width: 480px) {
      .circle-btn-group {
        gap: 16px;
      }
      
      .circle-btn {
        width: 64px;
        height: 64px;
      }
      
      .btn-label {
        font-size: 13px;
      }
      
      .circle-btn .btn-icon svg {
        width: 24px;
        height: 24px;
      }
    }

    /* 超小螢幕 - 圓形按鈕調整 */
    @media (max-width: 320px) {
      .circle-btn-group {
        gap: 16px;
      }
      
      .circle-btn {
        width: 48px;
        height: 48px;
      }
      
      .btn-label {
        font-size: 10px;
      }
      
      /* 輪播手機端優化 */
      .carousel-container {
        gap: 12px !important;
      }
      
      .product-card {
        min-width: 200px !important;
      }
      
      .carousel-nav-btn {
        width: 28px !important;
        height: 28px !important;
        font-size: 12px !important;
      }
    }
  </style>
</head>
<body>
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
  <div class="container">

    <!-- 介紹圖片展示區域 (移至上方) -->
    ${(() => {
      let introImages = [];
      // 使用 pageToRender.introImages 欄位
      if (pageToRender.introImages) {
        try {
          introImages = JSON.parse(pageToRender.introImages);
        } catch (e) {
          console.log("解析介紹圖片失敗:", e);
        }
      }

      if (introImages.length > 0) {
        return `
            <!-- 介紹圖片展示區域 (無標題) -->
            <div style=\"margin-bottom: 32px;\">
              <div style=\"display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;\">
                ${introImages
                  .slice(0, 6) // 最多顯示6張介紹圖片
                  .map(
                    (img, index) => `
                  <div style=\"
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid rgba(203, 213, 225, 0.3);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  \">
                    <img src=\"${img}\" alt=\"介紹圖片 ${index + 1}\" style=\"
                      width: 100%;
                      height: 160px;
                      object-fit: cover;
                      display: block;
                    \">
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `;
      } else {
        // 如果沒有介紹圖片，不顯示任何內容
        return "";
      }
    })()}


    <div class="main-grid">
      <!-- 左側區域：圖片展示和按鈕 -->
      <div class="left-section">
        <!-- 圖片展示卡片 -->
        <div class="card">
          ${
            images && images.length > 0
              ? images.length === 1
                ? images[0].startsWith("css-file-icon:")
                  ? `<div class="image-gallery">
                      <div class="main-image-container file-icon-container">
                        <div class="file-icon file-icon-${images[0].replace(
                          "css-file-icon:",
                          ""
                        )}">
                          <div class="file-icon-extension">.${images[0]
                            .replace("css-file-icon:", "")
                            .toUpperCase()}</div>
                        </div>
                      </div>
                    </div>`
                  : `<div class="image-gallery">
                      <div class="main-image-container">
                        <img src="${images[0]}" alt="${pageToRender.title}" class="main-image">
                      </div>
                    </div>`
                : `<div class="image-gallery">
                    <!-- 主要大圖區域 -->
                    <div class="main-image-container">
                      ${
                        images[0].startsWith("css-file-icon:")
                          ? `<div class="file-icon file-icon-${images[0].replace(
                              "css-file-icon:",
                              ""
                            )}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                            <div class="file-icon-extension">.${images[0]
                              .replace("css-file-icon:", "")
                              .toUpperCase()}</div>
                          </div>`
                          : `<img src="${images[0]}" alt="${pageToRender.title} - 圖片 1" class="main-image" id="mainImage">`
                      }
                    </div>
                    
                    <!-- 縮圖導航區域 -->
                    <div class="thumbnail-container">
                      <button class="thumbnail-nav prev" onclick="scrollThumbnails(-1)" id="prevBtn">‹</button>
                      
                      <div class="thumbnail-wrapper">
                        <div class="thumbnail-track" id="thumbnailTrack">
                          ${images
                            .map(
                              (img, index) =>
                                `<div class="thumbnail ${
                                  index === 0 ? "active" : ""
                                }" onclick="changeMainImage(${index})">
                                  ${
                                    img.startsWith("css-file-icon:")
                                      ? `<div class="file-icon file-icon-${img.replace(
                                          "css-file-icon:",
                                          ""
                                        )}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                                        .${img
                                          .replace("css-file-icon:", "")
                                          .toUpperCase()}
                                      </div>`
                                      : `<img src="${img}" alt="${
                                          pageToRender.title
                                        } - 縮圖 ${index + 1}">`
                                  }
                                </div>`
                            )
                            .join("")}
                        </div>
                      </div>
                      
                      <button class="thumbnail-nav next" onclick="scrollThumbnails(1)" id="nextBtn">›</button>
                    </div>
                  </div>`
              : `<div class="image-gallery">
                  <div class="main-image-container" style="display: flex; align-items: center; justify-content: center; color: #9ca3af;">
                    <span>產品封面</span>
                  </div>
                </div>`
          }
        </div>
        
        <!-- 圓形按鈕功能區域 - 版本2：分離卡片 -->
        <div class="action-buttons-circle">
          <div class="action-cards-separate">
            <div class="action-card-individual" onclick="previewContent()">
              <button class="circle-btn btn-read" id="previewBtn">
                <div class="btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
              </button>
              <span class="btn-label">線上閱讀</span>
            </div>

            <div class="action-card-individual" onclick="toggleFavorite()">
              <button class="circle-btn btn-favorite" id="favoriteBtn">
                <div class="btn-icon">
                  <svg id="favoriteIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
              </button>
              <span class="btn-label">收藏</span>
            </div>

            <div class="action-card-individual" onclick="shareContent()">
              <button class="circle-btn btn-share" id="shareBtn">
                <div class="btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <path d="m8.59 13.51 6.83 3.98"/>
                    <path d="m15.41 6.51-6.82 3.98"/>
                  </svg>
                </div>
              </button>
              <span class="btn-label">分享連結</span>
            </div>
          </div>
        </div>

        <!-- 圓形按鈕功能區域 - 版本1：單一卡片（註解掉，可切換使用） -->
        <!--
        <div class="action-buttons-circle">
          <div class="action-card-single">
            <div class="circle-btn-group">
              <div class="circle-btn-item">
                <button class="circle-btn btn-read" onclick="previewContent()" id="previewBtn">
                  <div class="btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </div>
                </button>
                <span class="btn-label">線上閱讀</span>
              </div>
              <div class="circle-btn-item">
                <button class="circle-btn btn-favorite" onclick="toggleFavorite()" id="favoriteBtn">
                  <div class="btn-icon">
                    <svg id="favoriteIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                </button>
                <span class="btn-label">收藏</span>
              </div>
              <div class="circle-btn-item">
                <button class="circle-btn btn-share" onclick="shareContent()" id="shareBtn">
                  <div class="btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="18" cy="5" r="3"/>
                      <circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <path d="m8.59 13.51 6.83 3.98"/>
                      <path d="m15.41 6.51-6.82 3.98"/>
                    </svg>
                  </div>
                </button>
                <span class="btn-label">分享連結</span>
              </div>
            </div>
          </div>
        </div>
        -->
      </div>
      
      <!-- 右側卡片容器 -->
      <div class="right-cards-container">
        <!-- 資訊卡片 -->
        <div class="info-card">
          <h1 style="font-size: 32px; margin-bottom: 10px; color: #1f2937;">${
            pageToRender.title
          }</h1>
          <div style="color: #6b7280; margin-bottom: 16px;">
            ⭐⭐⭐⭐⭐ 5.0 • ${fileInfo ? fileInfo.downloads : 0} 次下載
          </div>
          <div style="color: #4b5563; margin-bottom: 16px; line-height: 1.6;">
            ${pageToRender.description || "免費下載資源，立即獲取實用內容。"}
          </div>

          ${
            fileInfo
              ? `<ul style="list-style: disc; padding-left: 20px; margin-bottom: 0; color: #4b5563;">
                  <li>檔案名稱：${fileInfo.name}</li>
                  <li>已下載：${fileInfo.downloads} 次</li>
                  <li>格式：PDF（可列印）</li>
                </ul>`
              : ""
          }
        </div>

        <!-- 下載卡片 -->
        <div class="download-card" id="downloadCard">
          <h5 style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 16px;">免費下載</h5>
          
          <!-- 登入提示區塊 (初始顯示) -->
          <div id="loginPrompt" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(29, 78, 216, 0.05) 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(59, 130, 246, 0.2);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                🔐
              </div>
              <div style="flex: 1;">
                <h6 style="font-size: 15px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;">會員快速下載</h6>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">登入後免填表單，一鍵下載</p>
              </div>
            </div>
            <button onclick="goToLogin()" style="width: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 12px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>👤</span>
              登入帳號
            </button>
          </div>
          
          <!-- 分隔線 -->
          <div id="divider" style="text-align: center; margin: 20px 0; color: #9ca3af; font-size: 14px; position: relative;">
            <span style="background: rgba(255, 255, 255, 0.9); padding: 0 16px; position: relative; z-index: 1;">或訪客下載</span>
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e5e7eb; z-index: 0;"></div>
          </div>
          
          <!-- 訪客表單 (初始顯示) -->
          <form id="guestForm" onsubmit="handleDownload(event)">
            <div style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500; color: #374151; font-size: 14px;">姓名 <span style="color: #ef4444;">*</span></label>
              <input type="text" name="name" required style="width: 100%; padding: 14px 16px; border: none; border-radius: 6px; background: #EDEFF2; color: #1f2937; font-size: 14px;">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500; color: #374151; font-size: 14px;">電子郵件 <span style="color: #ef4444;">*</span></label>
              <input type="email" name="email" required style="width: 100%; padding: 14px 16px; border: none; border-radius: 6px; background: #EDEFF2; color: #1f2937; font-size: 14px;">
            </div>
            <button type="submit" class="download-btn" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 14px 26px; border-radius: 8px; cursor: pointer; font-size: 17px; width: 100%; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px; animation: pulse-shadow 2s infinite;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: icon-bounce 2s infinite;">
                <path d="M21 15v4a2 2 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              立即下載
            </button>
          </form>
          
          <!-- 會員快速下載區域 (初始隱藏) -->
          <div id="memberSection" style="display: none;">
            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(16, 185, 129, 0.2);">
              <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;" id="userAvatar">
                  U
                </div>
                <div style="flex: 1;">
                  <h6 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;">歡迎回來，<span id="userName">用戶</span>！</h6>
                  <p style="font-size: 14px; color: #6b7280; margin: 0;">您可以直接下載此檔案</p>
                </div>
              </div>
              
              <button onclick="quickDownload()" style="width: 100%; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; padding: 14px 26px; border-radius: 8px; font-size: 17px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                立即下載
              </button>
              
              <div style="display: flex; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(16, 185, 129, 0.1); color: #10b981; font-size: 13px;">
                <span>✅ 免填表單</span>
                <span>✅ 下載記錄保存</span>
                <span>✅ 專屬會員內容</span>
              </div>
            </div>
            
            <button onclick="logoutAndShowForm()" style="width: 100%; background: rgba(107, 114, 128, 0.1); color: #6b7280; border: 1px solid #e5e7eb; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
              改用訪客下載
            </button>
          </div>
        </div>
      </div>
    </div>

    
    <!-- 作者資訊Banner區域 -->
${(() => {
  if (pageToRender.user) {
    return `
  <div style="background: rgba(255, 255, 255, 0.8); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid rgba(203, 213, 225, 0.4); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 20px;">
    <!-- 頭像區域 -->
    <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; flex-shrink: 0; border: 3px solid rgba(255, 255, 255, 0.3); cursor: pointer;" onclick="goToUserProfile()">
      ${pageToRender.user.name.charAt(0).toUpperCase()}
    </div>

    <!-- 作者資訊區域 -->
    <div style="flex: 1;">
      <h5 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; cursor: pointer;" onclick="goToUserProfile()">作者：${
        pageToRender.user.name
      }</h5>
      <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
        ${
          pageToRender.user.bio ||
          "專業的內容創作者，致力於分享高品質的資源與知識。"
        }
      </p>

      <!-- 統計資訊 -->
      <div style="display: flex; align-items: center; gap: 16px; margin-top: 8px;">
        <span style="color: #9ca3af; font-size: 13px;">
          ⭐ 5.0 • ${fileInfo ? fileInfo.downloads : 0} 次下載
        </span>
        <span style="color: #9ca3af; font-size: 13px;">
          📅 ${new Date(pageToRender.createdAt).toLocaleDateString("zh-TW")}
        </span>
      </div>

      <!-- 按鈕區域 -->
      <div style="display: flex; align-items: center; gap: 10px; margin-top: 16px;">
        <button onclick="goToUserProfile()" style="background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0"/>
            <path d="M3 12h18"/>
            <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/>
          </svg>
          查看檔案
        </button>
        <button onclick="toggleFollow()" style="background: rgba(107, 114, 128, 0.1); color: #6b7280; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 6px;" id="followBtn">
          <svg id="followIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          <span id="followBtnText">追蹤</span>
        </button>
      </div>
    </div>
  </div>
`;
  } else {
    return `
          <div style="background: rgba(255, 255, 255, 0.8); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid rgba(203, 213, 225, 0.4); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 20px;">
            <!-- 默認頭像 -->
            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6b7280, #4b5563); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; flex-shrink: 0; border: 3px solid rgba(255, 255, 255, 0.3);">
              西
            </div>

            <!-- 作者資訊區域 -->
            <div style="flex: 1;">
              <h5 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0;">作者：西譯社</h5>
              <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
                專業的內容創作者，致力於分享高品質的資源與知識。
              </p>

              <!-- 統計資訊 -->
              <div style="display: flex; align-items: center; gap: 16px; margin-top: 8px;">
                <span style="color: #9ca3af; font-size: 13px;">
                  ⭐ 5.0 • ${fileInfo ? fileInfo.downloads : 0} 次下載
                </span>
                <span style="color: #9ca3af; font-size: 13px;">
                  📅 ${new Date(pageToRender.createdAt).toLocaleDateString(
                    "zh-TW"
                  )}
                </span>
              </div>
            </div>
          </div>
        `;
  }
})()}

    
    <!-- 類似產品區域 -->
    <div style="background: rgba(255, 255, 255, 0.9); border-radius: 12px; padding: 30px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid rgba(203, 213, 225, 0.6); backdrop-filter: blur(10px);">
      <h3 style="font-size: 20px; font-weight: 600; color: #1f2937; margin: 0 0 24px 0; display: flex; align-items: center; gap: 8px;">
        <span>⭐</span>
        類似產品
      </h3>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
          ${(() => {
            // 只顯示前4個產品 - 模擬推薦產品數據
            const recommendedProducts = [
              {
                id: 1,
                title: "AI 自動化工作流程指南",
                description:
                  "學習如何使用 AI 工具優化日常工作流程，提升工作效率 300%",
                downloads: 1250,
                rating: 4.9,
                slug: "ai-automation-guide",
              },
              {
                id: 2,
                title: "Python 數據分析實戰教程",
                description:
                  "從零開始學習 Python 數據分析，包含 Pandas、NumPy、Matplotlib 實戰案例",
                downloads: 890,
                rating: 4.8,
                slug: "python-data-analysis",
              },
              {
                id: 3,
                title: "UI/UX 設計系統完整指南",
                description:
                  "建立統一的設計系統，提升產品設計一致性和用戶體驗品質",
                downloads: 675,
                rating: 4.7,
                slug: "ui-ux-design-system",
              },
              {
                id: 4,
                title: "區塊鏈技術應用實戰",
                description:
                  "深入淺出學習區塊鏈技術，從基礎概念到實際應用項目開發",
                downloads: 542,
                rating: 4.6,
                slug: "blockchain-applications",
              },
            ];

            return recommendedProducts
              .map(
                (product) => `
              <div class="product-card" onclick="window.open('/download-page/${
                product.slug
              }', '_blank')" style="background: rgba(248, 250, 252, 0.8); border-radius: 8px; padding: 14px; border: 1px solid rgba(203, 213, 225, 0.4); cursor: pointer; transition: all 0.3s ease;">
                <div style="width: 100%; height: 120px; border-radius: 6px; overflow: hidden; margin-bottom: 10px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); display: flex; align-items: center; justify-content: center;">
                  <div style="width: 50px; height: 50px; border-radius: 6px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                    ${product.title.charAt(0)}
                  </div>
                </div>
                <h4 style="font-size: 13px; font-weight: 600; color: #1f2937; margin: 0 0 6px 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${
                  product.title
                }</h4>
                <p style="font-size: 11px; color: #6b7280; margin: 0 0 10px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${
                  product.description
                }</p>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="color: #fbbf24; font-size: 11px;">⭐</span>
                    <span style="font-size: 11px; color: #4b5563; font-weight: 500;">${
                      product.rating
                    }</span>
                  </div>
                  <div style="font-size: 11px; color: #6b7280;">
                    ${product.downloads} 下載
                  </div>
                </div>
              </div>
            `
              )
              .join("");
          })()}
        </div>
    </div>

    <!-- 內容簡介與會員評價 - 網格外單獨的完整寬度區域 -->
    <div style=\"background: rgba(255, 255, 255, 0.6); border-radius: 12px; padding: 30px; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid rgba(203, 213, 225, 0.4); backdrop-filter: blur(10px);\">
      <!-- 內容簡介 -->
      <div style=\"margin-bottom: 40px;\">
        <h4 style=\"background: #F2F2F2; padding: 16px 24px; margin: -8px -8px 20px -8px; border-radius: 8px; font-size: 24px; font-weight: 600; color: #1f2937; border-left: 4px solid #3b82f6; text-align: center;\">📖 內容簡介</h4>
        <div style=\"color: #4b5563; line-height: 1.7; font-size: 15px; margin-bottom: 25px;\">
           ${
             // 優先檢查頁面的 content 字段
             pageToRender.content && pageToRender.content.trim() !== ""
               ? `<div style="white-space: pre-wrap;">${pageToRender.content}</div>`
               : fileInfo && fileInfo.content && fileInfo.content.trim() !== ""
               ? `<div style="white-space: pre-wrap;">${fileInfo.content}</div>`
               : pageToRender.description &&
                 pageToRender.description !== "免費下載資源，立即獲取實用內容。"
               ? `<p style="margin-bottom: 16px;">${pageToRender.description}</p>`
               : `<p style="margin-bottom: 16px;">這是一個精彩的內容資源，提供實用的知識與工具。<br>
                    下載後您將獲得詳細的內容介紹與使用說明。<br>
                    我們致力於提供高品質的學習資料，幫助您提升技能與知識。<br>
                    立即填寫表單，免費獲取這份珍貴的資源！</p>`
           }
        </div>
        
        ${
          fileInfo && fileInfo.content
            ? "" // 如果有動態內容，就不顯示推薦區塊
            : `<div style="background: rgba(59, 130, 246, 0.05); border-left: 3px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                 <h5 style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">✨ 推薦資源</h5>
                 <p style="margin-bottom: 8px; color: #374151; font-size: 14px;">專業團隊精心製作</p>
                 <p style="margin: 0; color: #374151; font-size: 14px;">實用性與專業性並重</p>
               </div>`
        }
      </div>

      <!-- 會員評價 -->
      <div>
        <h4 style=\"background: #F2F2F2; padding: 16px 24px; margin: -8px -8px 20px -8px; border-radius: 8px; font-size: 24px; font-weight: 600; color: #1f2937; border-left: 4px solid #f59e0b; text-align: center;\">⭐ 會員評價</h4>

        <div style=\"display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;\">
          <!-- Review 1 -->
          <div style=\"background: rgba(248, 250, 252, 0.8); border-radius: 10px; padding: 20px; border: 1px solid rgba(203, 213, 225, 0.2); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\">
            <div style=\"display: flex; align-items: center; gap: 15px; margin-bottom: 12px;\">
              <div style=\"width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;\">
                李
              </div>
              <div>
                <h6 style=\"font-size: 15px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;\">李小明</h6>
                <div style=\"display: flex; align-items: center; gap: 8px;\">
                  <div style=\"color: #fbbf24; font-size: 14px;\">★★★★★</div>
                  <span style=\"color: #6b7280; font-size: 13px;\">5.0</span>
                </div>
              </div>
            </div>
            <p style=\"color: #4b5563; line-height: 1.6; margin: 0; font-size: 14px;\">
              \"這份資料真的很實用！內容詳細又容易理解，幫助我解決了工作上的許多問題。作者的專業度很高，推薦給所有需要的朋友！\"
            </p>
          </div>

          <!-- Review 2 -->
          <div style=\"background: rgba(248, 250, 252, 0.8); border-radius: 10px; padding: 20px; border: 1px solid rgba(203, 213, 225, 0.2); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\">
            <div style=\"display: flex; align-items: center; gap: 15px; margin-bottom: 12px;\">
              <div style=\"width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;\">
                陳
              </div>
              <div>
                <h6 style=\"font-size: 15px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;\">陳美華</h6>
                <div style=\"display: flex; align-items: center; gap: 8px;\">
                  <div style=\"color: #fbbf24; font-size: 14px;\">★★★★★</div>
                  <span style=\"color: #6b7280; font-size: 13px;\">5.0</span>
                </div>
              </div>
            </div>
            <p style=\"color: #4b5563; line-height: 1.6; margin: 0; font-size: 14px;\">
              \"免費就能獲得這麼高品質的內容，真的太感動了！西譯社的資料都很精心製作，每次下載都有收穫。已經推薦給同事了！\"
            </p>
          </div>

          <!-- Review 3 -->
          <div style=\"background: rgba(248, 250, 252, 0.8); border-radius: 10px; padding: 20px; border: 1px solid rgba(203, 213, 225, 0.2); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\">
            <div style=\"display: flex; align-items: center; gap: 15px; margin-bottom: 12px;\">
              <div style=\"width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;\">
                王
              </div>
              <div>
                <h6 style=\"font-size: 15px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;\">王大偉</h6>
                <div style=\"display: flex; align-items: center; gap: 8px;\">
                  <div style=\"color: #fbbf24; font-size: 14px;\">★★★★☆</div>
                  <span style=\"color: #6b7280; font-size: 13px;\">4.8</span>
                </div>
              </div>
            </div>
            <p style=\"color: #4b5563; line-height: 1.6; margin: 0; font-size: 14px;\">
              \"內容非常豐富，排版也很清楚。雖然有些部分需要更深入的說明，但整體來說是很棒的資源。作者很用心在製作，值得支持！\"
            </p>
          </div>
        </div>
      </div>
    </div>
    
  </div>

  <!-- Footer -->
  <footer style="background: #f9fafb; color: #6b7280; padding: 48px 0; margin-top: 60px;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; margin-bottom: 32px;">
        <div>
          <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">Upper</h3>
          <p style="color: #6b7280; line-height: 1.6;">專業的檔案分享與引流磁鐵平台</p>
        </div>
        <div>
          <h4 style="font-weight: 600; margin-bottom: 16px; color: #1f2937;">產品</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">功能特色</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">方案價格</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">API 文件</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 style="font-weight: 600; margin-bottom: 16px; color: #1f2937;">支援</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">幫助中心</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">聯絡我們</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">狀態頁面</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 style="font-weight: 600; margin-bottom: 16px; color: #1f2937;">公司</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">關於我們</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">隱私政策</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">服務條款</a>
            </li>
          </ul>
        </div>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 32px; text-align: center; color: #9ca3af;">
        <p>&copy; 2025 Upper. All rights reserved.</p>
      </div>
    </div>
    
    <!-- 響應式樣式 -->
    <style>
      @media (max-width: 768px) {
        footer > div > div:first-child {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 20px !important;
        }
      }
      @media (max-width: 480px) {
        footer > div > div:first-child {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  </footer>

  <script>
    // 新的畫廊系統變數
    let currentImageIndex = 0;
    const images = document.querySelectorAll('.thumbnail');
    const mainImage = document.getElementById('mainImage');
    const thumbnailTrack = document.getElementById('thumbnailTrack');
    let currentThumbnailOffset = 0;
    
    // 更換主圖
    function changeMainImage(index) {
      if (!images || images.length === 0) return;
      
      // 更新 active 狀態
      images.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
      });
      
      // 更新主圖
      if (mainImage) {
        const selectedThumbnail = images[index];
        const imgElement = selectedThumbnail.querySelector('img');
        if (imgElement) {
          mainImage.src = imgElement.src;
          mainImage.alt = imgElement.alt;
        }
      }
      
      currentImageIndex = index;
    }
    
    // 縮圖滾動
    function scrollThumbnails(direction) {
      if (!thumbnailTrack || !images || images.length <= 4) return; // 如果縮圖少於4個就不需要滾動
      
      const thumbnailWidth = 88; // 80px + 8px gap
      const maxOffset = -(images.length - 4) * thumbnailWidth;
      
      currentThumbnailOffset += direction * thumbnailWidth;
      
      // 限制滾動範圍
      if (currentThumbnailOffset > 0) {
        currentThumbnailOffset = 0;
      } else if (currentThumbnailOffset < maxOffset) {
        currentThumbnailOffset = maxOffset;
      }
      
      thumbnailTrack.style.transform = 'translateX(' + currentThumbnailOffset + 'px)';
      
      // 更新按鈕狀態
      updateNavigationButtons();
    }
    
    // 更新導航按鈕狀態
    function updateNavigationButtons() {
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      
      if (!prevBtn || !nextBtn || !images || images.length <= 4) return;
      
      const thumbnailWidth = 88;
      const maxOffset = -(images.length - 4) * thumbnailWidth;
      
      prevBtn.disabled = currentThumbnailOffset >= 0;
      nextBtn.disabled = currentThumbnailOffset <= maxOffset;
    }
    
    // 初始化畫廊
    function initializeGallery() {
      if (images && images.length > 0) {
        // 設定第一張圖為預設
        changeMainImage(0);
        updateNavigationButtons();
      }
    }
    
    // 頁面載入完成後初始化
    document.addEventListener('DOMContentLoaded', initializeGallery);
    
    // Follow functionality
    let isFollowing = false;

    function toggleFollow() {
      const followIcon = document.getElementById('followIcon');
      const followBtn = document.getElementById('followBtn');
      const followBtnText = document.getElementById('followBtnText');

      isFollowing = !isFollowing;

      if (isFollowing) {
        // Following state - update button style and icon
        if (followBtn) {
          followBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          followBtn.style.color = 'white';
          followBtn.style.border = 'none';
        }
        if (followBtnText) {
          followBtnText.textContent = '已追蹤';
        }
        if (followIcon) {
          // Change to filled heart icon for following state
          followIcon.innerHTML = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>';
        }
      } else {
        // Not following state - update button style and icon
        if (followBtn) {
          followBtn.style.background = 'rgba(107, 114, 128, 0.1)';
          followBtn.style.color = '#6b7280';
          followBtn.style.border = '1px solid #d1d5db';
        }
        if (followBtnText) {
          followBtnText.textContent = '追蹤';
        }
        if (followIcon) {
          // Change back to add user icon for not following state
          followIcon.innerHTML = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>';
        }
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
          // 開始下載
          const downloadLink = document.createElement('a');
          downloadLink.href = result.downloadUrl;
          downloadLink.download = '';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          // 延遲跳轉到成功頁面
          setTimeout(() => {
            if (result.redirectUrl) {
              window.location.href = result.redirectUrl;
            } else {
              window.location.href = '/download-success.html';
            }
          }, 1000);
        } else {
          alert('下載失敗：' + result.message);
        }
      } catch (error) {
        alert('發生錯誤，請稍後再試');
      }
    }
    
    // 追蹤事件的輔助函數
    async function trackEvent(event, metadata = {}) {
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageId: ${pageToRender.id || "null"},
            event: event,
            data: {
              ...metadata,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              url: window.location.href
            },
            userAgent: navigator.userAgent,
            ipAddress: undefined // 服務器端會處理
          })
        });
      } catch (error) {
        console.warn('無法追蹤事件:', error);
      }
    }

    // 顯示模態窗口
    function showModal(title, content, actions = []) {
      // 移除現有的模態窗口
      const existingModal = document.getElementById('customModal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // 創建模態窗口
      const modal = document.createElement('div');
      modal.id = 'customModal';
      modal.innerHTML = \`
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        ">
          <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            transform: scale(0.95);
            animation: modalShow 0.3s ease forwards;
          ">
            <div style="margin-bottom: 16px;">
              <h3 style="
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin: 0 0 8px 0;
              ">\${title}</h3>
              <div style="
                color: #4b5563;
                line-height: 1.5;
                font-size: 14px;
              ">\${content}</div>
            </div>
            <div id="modalActions" style="
              display: flex;
              gap: 8px;
              justify-content: flex-end;
              margin-top: 20px;
            "></div>
          </div>
        </div>
        <style>
          @keyframes modalShow {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        </style>
      \`;
      
      // 添加動作按鈕
      const actionsContainer = modal.querySelector('#modalActions');
      actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.text;
        button.style.cssText = \`
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          \${action.primary ?
            'background: #3b82f6; color: white;' :
            'background: #f3f4f6; color: #6b7280;'
          }
        \`;
        button.onclick = () => {
          action.onClick();
          modal.remove();
        };
        actionsContainer.appendChild(button);
      });
      
      // 點擊背景關閉
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      };
      
      document.body.appendChild(modal);
    }

    // 分享功能
    async function shareContent() {
      const shareBtn = document.getElementById('shareBtn');
      const originalText = shareBtn.innerHTML;
      const currentUrl = window.location.href;
      
      // 追蹤分享嘗試事件
      await trackEvent('share_attempt', {
        shareMethod: 'modal_share',
        pageTitle: \`${pageToRender.title.replace(/'/g, "\\'")}\`,
        pageSlug: \`${pageToRender.slug}\`
      });
      
      // 顯示分享模態窗口
      showModal(
        '分享連結',
        \`
          <div style="margin: 16px 0;">
            <p style="margin-bottom: 12px; color: #374151;">複製下方連結分享給朋友：</p>
            <div style="
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              font-family: monospace;
              font-size: 12px;
              word-break: break-all;
              color: #1f2937;
            ">\${currentUrl}</div>
          </div>
        \`,
        [
          {
            text: '取消',
            primary: false,
            onClick: () => {}
          },
          {
            text: '複製連結',
            primary: true,
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(currentUrl);
                shareBtn.innerHTML = '<span>✅</span>已複製';
                
                // 追蹤複製成功
                await trackEvent('share_success', {
                  shareMethod: 'clipboard',
                  pageTitle: \`${pageToRender.title.replace(/'/g, "\\'")}\`,
                  pageSlug: \`${pageToRender.slug}\`
                });
                
                setTimeout(() => {
                  shareBtn.innerHTML = originalText;
                }, 2000);
              } catch (error) {
                console.error('複製失敗:', error);
                shareBtn.innerHTML = '<span>❌</span>複製失敗';
                
                // 追蹤分享失敗
                await trackEvent('share_failed', {
                  shareMethod: 'clipboard',
                  error: error.message,
                  pageTitle: \`${pageToRender.title.replace(/'/g, "\\'")}\`,
                  pageSlug: \`${pageToRender.slug}\`
                });
                
                setTimeout(() => {
                  shareBtn.innerHTML = originalText;
                }, 2000);
              }
            }
          }
        ]
      );
    }
    
    // 線上閱讀功能 - 顯示登入提示
    async function previewContent() {
      // 追蹤預覽嘗試事件
      await trackEvent('preview_attempt', {
        requiresLogin: true,
        pageTitle: \`${pageToRender.title.replace(/'/g, "\\'")}\`,
        pageSlug: \`${pageToRender.slug}\`
      });
      
      showModal(
        '線上閱讀需要登入',
        \`
          <div style="text-align: center; margin: 16px 0;">
            <div style="font-size: 48px; margin-bottom: 16px;">👤</div>
            <p style="color: #4b5563; margin-bottom: 8px;">
              線上閱讀功能需要登入後才能使用
            </p>
            <p style="color: #6b7280; font-size: 13px;">
              登入後可享受更多專屬功能和內容
            </p>
          </div>
        \`,
        [
          {
            text: '取消',
            primary: false,
            onClick: () => {}
          },
          {
            text: '前往登入',
            primary: true,
            onClick: () => {
              window.location.href = '/admin.html';
            }
          }
        ]
      );
    }
    
    // 收藏功能 - 顯示登入提示
    function toggleFavorite() {
      showModal(
        '收藏功能需要登入',
        \`
          <div style="text-align: center; margin: 16px 0;">
            <div style="font-size: 48px; margin-bottom: 16px;">❤️</div>
            <p style="color: #4b5563; margin-bottom: 8px;">
              收藏功能需要登入後才能使用
            </p>
            <p style="color: #6b7280; font-size: 13px;">
              登入後可收藏喜愛的內容，隨時查看
            </p>
          </div>
        \`,
        [
          {
            text: '取消',
            primary: false,
            onClick: () => {}
          },
          {
            text: '前往登入',
            primary: true,
            onClick: () => {
              window.location.href = '/admin.html';
            }
          }
        ]
      );
    }
    
    // 初始化收藏狀態
    function initializeFavorite() {
      const pageSlug = '${pageToRender.slug}';
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const favoriteBtn = document.getElementById('favoriteBtn');
      const favoriteIcon = document.getElementById('favoriteIcon');
      
      if (favorites.includes(pageSlug)) {
        favoriteIcon.innerHTML = '💖';
        favoriteBtn.classList.add('favorited');
      }
    }
    
    // 前往用戶個人檔案頁面
    function goToUserProfile() {
      ${
        pageToRender.user
          ? `window.location.href = '/user/${pageToRender.user.id}';`
          : `console.log('無用戶資訊');`
      }
    }
    
    // 打開圖片模態框
    function openImageModal(imageSrc, title) {
      showModal(
        title || '圖片預覽',
        \`
          <div style="text-align: center; margin: 16px 0;">
            <img src="\${imageSrc}" alt="\${title}" style="
              max-width: 100%;
              max-height: 400px;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            ">
          </div>
        \`,
        [
          {
            text: '關閉',
            primary: true,
            onClick: () => {}
          }
        ]
      );
    }
    
    // 頁面載入時初始化
    document.addEventListener('DOMContentLoaded', function() {
      initializeGallery();
      initializeFavorite();
      checkAuthStatus(); // 檢查登入狀態
      initCircleButtons(); // 初始化圓形按鈕
    });

    // 初始化圓形按鈕動畫和交互
    function initCircleButtons() {
      const buttons = document.querySelectorAll('.circle-btn');
      
      buttons.forEach(btn => {
        // 添加點擊波紋效果
        btn.addEventListener('click', function(e) {
          const ripple = document.createElement('span');
          ripple.className = 'ripple-effect';
          ripple.style.position = 'absolute';
          ripple.style.borderRadius = '50%';
          ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
          ripple.style.pointerEvents = 'none';
          
          const rect = this.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top - size / 2;
          
          ripple.style.width = ripple.style.height = size + 'px';
          ripple.style.left = x + 'px';
          ripple.style.top = y + 'px';
          ripple.style.animation = 'rippleAnimation 0.6s ease-out';
          
          this.appendChild(ripple);
          
          setTimeout(() => ripple.remove(), 600);
        });
        
        // 添加鍵盤支援
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('role', 'button');
        
        btn.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
          }
        });
      });
    }
    
    // 檢查登入狀態
    async function checkAuthStatus() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        // 未登入，顯示預設的訪客模式
        showGuestMode();
        return;
      }
      
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // 已登入，顯示會員快速下載
            showMemberMode(data.user);
          } else {
            // Token 無效，顯示訪客模式
            showGuestMode();
          }
        } else {
          // 驗證失敗，清除 token 並顯示訪客模式
          localStorage.removeItem('authToken');
          showGuestMode();
        }
      } catch (error) {
        console.error('驗證登入狀態失敗:', error);
        showGuestMode();
      }
    }
    
    // 顯示訪客模式
    function showGuestMode() {
      const loginPrompt = document.getElementById('loginPrompt');
      const divider = document.getElementById('divider');
      const guestForm = document.getElementById('guestForm');
      const memberSection = document.getElementById('memberSection');
      
      if (loginPrompt) loginPrompt.style.display = 'block';
      if (divider) divider.style.display = 'block';
      if (guestForm) guestForm.style.display = 'block';
      if (memberSection) memberSection.style.display = 'none';
    }
    
    // 顯示會員模式
    function showMemberMode(user) {
      const loginPrompt = document.getElementById('loginPrompt');
      const divider = document.getElementById('divider');
      const guestForm = document.getElementById('guestForm');
      const memberSection = document.getElementById('memberSection');
      const userName = document.getElementById('userName');
      const userAvatar = document.getElementById('userAvatar');
      
      if (loginPrompt) loginPrompt.style.display = 'none';
      if (divider) divider.style.display = 'none';
      if (guestForm) guestForm.style.display = 'none';
      if (memberSection) memberSection.style.display = 'block';
      
      // 更新用戶資訊
      if (userName) userName.textContent = user.name || user.email.split('@')[0];
      if (userAvatar) {
        const firstChar = (user.name || user.email)[0].toUpperCase();
        userAvatar.textContent = firstChar;
      }
    }
    
    // 前往登入頁面
    function goToLogin() {
      // 保存當前頁面 URL 以便登入後返回
      sessionStorage.setItem('returnUrl', window.location.href);
      window.location.href = '/admin.html';
    }
    
    // 快速下載功能（已登入用戶）
    async function quickDownload() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        goToLogin();
        return;
      }
      
      try {
        const response = await fetch('/download-page/' + '${
          pageToRender.slug
        }' + '/quick', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        if (result.success) {
          // 開始下載
          const downloadLink = document.createElement('a');
          downloadLink.href = result.downloadUrl;
          downloadLink.download = '';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          // 顯示成功提示
          showModal(
            '下載成功',
            '<div style="text-align: center; margin: 16px 0;">' +
              '<div style="font-size: 48px; margin-bottom: 16px;">✅</div>' +
              '<p style="color: #4b5563;">' +
                '檔案下載已開始，請查看您的下載資料夾。' +
              '</p>' +
            '</div>',
            [
              {
                text: '確定',
                primary: true,
                onClick: () => {}
              }
            ]
          );
        } else {
          alert('下載失敗：' + result.message);
        }
      } catch (error) {
        alert('發生錯誤，請稍後再試');
      }
    }
    
    // 切換回訪客模式
    function logoutAndShowForm() {
      showGuestMode();
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

      // 整合客戶管理系統 - 使用 upsert 來處理重複的 Email
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: email },
      });

      const pageInfo = `[${new Date().toLocaleDateString(
        "zh-TW"
      )}] 從下載頁面 "${page?.title || slug}" 提交資料`;

      const customer = await prisma.customer.upsert({
        where: { email: email },
        update: {
          name: name, // 更新名稱（可能訪客使用不同的名稱）
          notes: existingCustomer?.notes
            ? `${existingCustomer.notes}\n${pageInfo}`
            : pageInfo,
        },
        create: {
          name,
          email,
          status: "potential", // 設定為潛在客戶
          notes: pageInfo,
        },
      });

      logger.info(
        `Customer ${customer.id} (${email}) submitted from download page: ${slug}`
      );

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
          redirectUrl: `/download-success.html?file=${encodeURIComponent(
            page.file.name
          )}&title=${encodeURIComponent(page.title)}`,
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

// Public user profile page
router.get(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    try {
      // Find user with public files and their associated pages
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        include: {
          files: {
            where: {
              isActive: true,
              isPublic: true,
            },
            include: {
              pages: {
                where: {
                  isActive: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user || !user.profilePublic) {
        return res.status(404).send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>使用者不存在 - Upper</title>
  <style>
    body { font-family: Arial, sans-serif; background: #F0F4F8; color: #1f2937; text-align: center; padding: 100px 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #ef4444; margin-bottom: 20px; }
    p { color: #6b7280; margin-bottom: 30px; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404 - 使用者不存在</h1>
    <p>抱歉，您要找的使用者頁面不存在或設為私人。</p>
    <a href="/">回到首頁</a>
  </div>
</body>
</html>`);
      }

      // Calculate user statistics
      const totalDownloads = user.files.reduce(
        (sum, file) => sum + file.downloads,
        0
      );
      const totalFiles = user.files.length;

      res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${user.name} - Upper</title>
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: Arial, sans-serif; 
      background: #F0F4F8;
      color: #1f2937;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    /* Navigation */
    .nav {
      background: rgba(255, 255, 255, 0.95);
      border-bottom: 1px solid #e2e8f0;
      padding: 20px 40px;
      margin: 0;
      backdrop-filter: blur(10px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      width: 100%;
    }
    .nav-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .logo-container { display: flex; align-items: center; }
    .logo { font-size: 24px; font-weight: bold; color: #1f2937; text-decoration: none; }
    .nav-links { display: flex; gap: 30px; align-items: center; }
    .nav-links a { color: #6b7280; text-decoration: none; transition: color 0.3s ease; }
    .nav-links a:hover { color: #3b82f6; }

    /* User Banner */
    .user-banner {
      width: 100%;
      height: 220px;
      background: #F2F2F2;
      border-radius: 12px;
      margin-bottom: 40px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
    }

    .banner-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .banner-content {
      text-align: center;
      color: white;
      z-index: 2;
    }

    .banner-welcome {
      font-size: 18px;
      margin-bottom: 8px;
      opacity: 0.9;
    }

    .banner-title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .banner-subtitle {
      font-size: 16px;
      opacity: 0.8;
    }

    /* Profile Layout */
    .profile-grid { display: grid; grid-template-columns: 300px 1fr; gap: 40px; }
    
    /* Left Sidebar - User Info */
    .user-sidebar {
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
      height: fit-content;
      overflow: hidden;
    }
    
    /* 頭像和基本資訊區域 */
    .profile-header {
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid rgba(203, 213, 225, 0.4);
    }
    
    .user-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 48px;
      margin: 0 auto 20px auto;
      border: 4px solid rgba(255, 255, 255, 0.2);
    }
    
    .user-name {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .user-username {
      color: #6b7280;
      font-size: 16px;
      margin-bottom: 16px;
    }
    
    /* 追蹤按鈕 */
    .follow-btn {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 16px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      min-width: 100px;
      justify-content: center;
    }
    
    .follow-btn:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
    }
    
    .follow-btn.following {
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }
    
    .follow-btn.following:hover {
      background: linear-gradient(135deg, #059669, #047857);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
    }
    
    /* 簡介區域 */
    .user-bio {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 20px;
      text-align: left;
    }
    
    /* 詳細資訊區域 */
    .user-details {
      padding: 20px 30px;
    }
    
    .user-details .detail-item {
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #4b5563;
    }
    
    .detail-icon {
      width: 16px;
      color: #6b7280;
      text-align: center;
    }
    
    .detail-link {
      color: #3b82f6;
      text-decoration: none;
    }
    
    .detail-link:hover {
      text-decoration: underline;
    }
    
    /* 社群帳號區域 */
    .social-section {
      padding: 20px 30px;
      border-top: 1px solid rgba(203, 213, 225, 0.4);
    }
    
    .social-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
    }
    
    .social-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .social-link {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
      padding: 6px 0;
      transition: color 0.3s ease;
    }
    
    .social-link:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
    
    /* 統計區域 */
    .user-stats {
      display: flex;
      justify-content: space-around;
      padding: 20px 30px;
      border-top: 1px solid rgba(203, 213, 225, 0.4);
      margin: 0;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-number {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    
    /* Right Content - Files */
    .files-section {
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(203, 213, 225, 0.6);
      backdrop-filter: blur(10px);
    }
    
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .files-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    
    .file-card {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 8px;
      padding: 20px;
      border: 1px solid rgba(203, 213, 225, 0.4);
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .file-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      border-color: #3b82f6;
    }
    
    .file-icon {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 15px;
    }
    
    .file-name {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 5px;
      font-size: 16px;
    }
    
    .file-meta {
      color: #6b7280;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .download-count {
      color: #10b981;
      font-weight: 500;
    }
    
    .empty-state {
      text-align: center;
      color: #9ca3af;
      padding: 60px 20px;
    }
    
    .empty-state-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    
    /* File type colors */
    .file-icon-txt, .file-icon-file { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .file-icon-pdf { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .file-icon-jpg, .file-icon-jpeg, .file-icon-png, .file-icon-gif, .file-icon-webp { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .file-icon-doc, .file-icon-docx { background: #F2F2F2; }
    .file-icon-xls, .file-icon-xlsx { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .file-icon-ppt, .file-icon-pptx { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .file-icon-zip, .file-icon-rar, .file-icon-7z { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
    .file-icon-mp4, .file-icon-avi, .file-icon-mov, .file-icon-mkv { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
    .file-icon-mp3, .file-icon-wav, .file-icon-flac, .file-icon-aac { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
    .file-icon-html, .file-icon-css, .file-icon-js, .file-icon-json { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); }
    
    /* User Banner Responsive */
    @media (max-width: 768px) {
      .user-banner {
        height: 120px;
        margin-bottom: 30px;
        border-radius: 8px;
      }

      .banner-title {
        font-size: 24px;
      }

      .banner-subtitle,
      .banner-welcome {
        font-size: 14px;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .profile-grid { grid-template-columns: 1fr; gap: 20px; }
      .files-grid { grid-template-columns: 1fr; }
      .user-sidebar { margin-bottom: 20px; }
    }
  </style>
</head>
<body>
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
  <div class="container">

    <!-- User Banner -->
    <div class="user-banner">
      <div class="banner-overlay">
        <div class="banner-content">
          <div class="banner-welcome">歡迎來到</div>
          <div class="banner-title">${user.name}</div>
          <div class="banner-subtitle">發現精彩的內容與資源</div>
        </div>
      </div>
    </div>

    <div class="profile-grid">
      <!-- Left Sidebar - User Information -->
      <div class="user-sidebar">
        <!-- 頭像和基本資訊 -->
        <div class="profile-header">
          <div class="user-avatar">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          
          <div class="user-name">${user.name}</div>
          <div class="user-username">@${user.email.split("@")[0]}</div>
          
          <!-- 追蹤按鈕 -->
          <button class="follow-btn" onclick="toggleFollow()" id="followBtn">
            <span id="followIcon">👤</span>
            <span id="followText">追蹤</span>
          </button>
          
          ${
            user.bio
              ? `<div class="user-bio">${user.bio}</div>`
              : `<div class="user-bio">專業的內容創作者，致力於分享高品質的資源與知識。</div>`
          }
        </div>
        
        <!-- 詳細資訊 -->
        <div class="user-details">
          ${
            user.company
              ? `<div class="detail-item">
                   <span class="detail-icon">🏢</span>
                   <span>${user.company}</span>
                 </div>`
              : ""
          }
          <div class="detail-item">
            <span class="detail-icon">📍</span>
            <span>${user.location || "台灣"}</span>
          </div>
          ${
            user.website
              ? `<div class="detail-item">
                   <span class="detail-icon">🔗</span>
                   <a href="${
                     user.website
                   }" target="_blank" class="detail-link">${user.website.replace(
                  /^https?:\/\//,
                  ""
                )}</a>
                 </div>`
              : `<div class="detail-item">
                   <span class="detail-icon">🔗</span>
                   <a href="https://example.com" target="_blank" class="detail-link">example.com</a>
                 </div>`
          }
          <div class="detail-item">
            <span class="detail-icon">📅</span>
            <span>加入於 ${new Date(user.createdAt).toLocaleDateString(
              "zh-TW"
            )}</span>
          </div>
        </div>
        
        <!-- 社群帳號 -->
        <div class="social-section">
          <div class="social-title">社群連結</div>
          <div class="social-links">
            <a href="#" class="social-link" target="_blank">
              <span>🐦</span>
              <span>Twitter</span>
            </a>
            <a href="#" class="social-link" target="_blank">
              <span>📘</span>
              <span>Facebook</span>
            </a>
            <a href="#" class="social-link" target="_blank">
              <span>📷</span>
              <span>Instagram</span>
            </a>
            <a href="#" class="social-link" target="_blank">
              <span>💼</span>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
        
        <!-- 統計數據 -->
        <div class="user-stats">
          <div class="stat-item">
            <div class="stat-number">${totalFiles}</div>
            <div class="stat-label">檔案</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${totalDownloads}</div>
            <div class="stat-label">下載</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">4.8</div>
            <div class="stat-label">評分</div>
          </div>
        </div>
      </div>
      
      <!-- Right Content - User Files -->
      <div class="files-section">
        <div class="section-title">
          <span>📁</span>
          公開檔案 (${totalFiles})
        </div>
        
        ${
          user.files.length > 0
            ? `
        <div class="files-grid">
          ${user.files
            .map((file) => {
              const extension =
                file.name.split(".").pop()?.toLowerCase() || "file";
              // Check if file has an associated active page
              const hasPage =
                file.pages && file.pages.length > 0 && file.pages[0].slug;
              return `
            <div class="file-card" onclick="${
              hasPage
                ? `window.open('/download-page/${file.pages[0].slug}', '_blank')`
                : `window.open('/download/${file.downloadSlug}', '_blank')`
            }">
              <div class="file-icon file-icon-${extension}">
                .${extension.toUpperCase()}
              </div>
              <div class="file-name">${file.name}</div>
              <div class="file-meta">
                <span>${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                <span class="download-count">${file.downloads} 下載</span>
              </div>
            </div>`;
            })
            .join("")}
        </div>
        `
            : `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h3 style="color: #6b7280; margin-bottom: 10px;">尚無公開檔案</h3>
          <p style="color: #9ca3af;">此使用者還沒有公開任何檔案</p>
        </div>
        `
        }
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer style="background: #f9fafb; color: #6b7280; padding: 48px 0; margin-top: 60px;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; margin-bottom: 32px;">
        <div>
          <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">Upper</h3>
          <p style="color: #6b7280; line-height: 1.6;">專業的檔案分享與引流磁鐵平台</p>
        </div>
        <div>
          <h4 style="font-weight: 600; margin-bottom: 16px; color: #1f2937;">產品</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">功能特色</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">方案價格</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">API 文件</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 style="font-weight: 600; margin-bottom: 16px; color: #1f2937;">支援</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">幫助中心</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">聯絡我們</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">狀態頁面</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 style="font-weight: 600; margin-bottom: 16px; color: #1f2937;">公司</h4>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">關於我們</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">隱私政策</a>
            </li>
            <li style="margin-bottom: 8px;">
              <a href="#" style="color: #6b7280; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#6b7280'">服務條款</a>
            </li>
          </ul>
        </div>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 32px; text-align: center; color: #9ca3af;">
        <p>&copy; 2025 Upper. All rights reserved.</p>
      </div>
    </div>

    <!-- Footer Responsive Styles -->
    <style>
      @media (max-width: 768px) {
        footer > div > div:first-child {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 20px !important;
        }
      }
      @media (max-width: 480px) {
        footer > div > div:first-child {
          grid-template-columns: 1fr !important;
        }
        footer {
          padding: 32px 0 24px 0 !important;
          margin-top: 40px !important;
        }
      }
    </style>
  </footer>

  <script>
    // 追蹤功能
    let isFollowing = false;
    
    function toggleFollow() {
      const followBtn = document.getElementById('followBtn');
      const followIcon = document.getElementById('followIcon');
      const followText = document.getElementById('followText');
      
      isFollowing = !isFollowing;
      
      if (isFollowing) {
        followBtn.classList.add('following');
        followIcon.textContent = '✓';
        followText.textContent = '已追蹤';
      } else {
        followBtn.classList.remove('following');
        followIcon.textContent = '👤';
        followText.textContent = '追蹤';
      }
    }
    
    // 頁面載入時初始化
    document.addEventListener('DOMContentLoaded', function() {
      // 可以在這裡添加其他初始化邏輯
    });
  </script>
</body>
</html>`);
    } catch (error) {
      logger.error(`Error generating user profile page: ${error.message}`);
      res.status(500).send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>錯誤 - Upper</title>
  <style>
    body { font-family: Arial, sans-serif; background: #F0F4F8; color: #1f2937; text-align: center; padding: 100px 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #ef4444; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>500 - 服務器錯誤</h1>
    <p>抱歉，載入使用者頁面時發生錯誤。</p>
  </div>
</body>
</html>`);
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
