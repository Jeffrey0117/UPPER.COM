import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addOnlinePreviewContent() {
  try {
    console.log("正在添加線上閱讀和影片內容範例...");

    // 先清除現有檔案
    await prisma.file.deleteMany({
      where: { userId: { in: [1, 4, 5] } },
    });

    // 為程式設計講師添加線上可預覽的內容
    await prisma.file.create({
      data: {
        userId: 1,
        name: "JavaScript 基礎教學影片系列",
        originalName: "javascript-basics-video.mp4",
        filename: "javascript-basics-video.mp4",
        mimeType: "video/mp4",
        sizeBytes: 104857600, // 100MB
        downloads: 456,
        downloadSlug: "js-video-" + Math.random().toString(36).substring(7),
        description: "6小時完整影片教學，從變數到函數，適合初學者線上觀看",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 1,
        name: "React 開發筆記 - 線上電子書",
        originalName: "react-development-guide.pdf",
        filename: "react-development-guide.pdf",
        mimeType: "application/pdf",
        sizeBytes: 8388608, // 8MB
        downloads: 789,
        downloadSlug: "react-ebook-" + Math.random().toString(36).substring(7),
        description: "200頁完整電子書，支援線上閱讀，包含互動式程式碼範例",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 1,
        name: "前端面試準備清單",
        originalName: "interview-checklist.md",
        filename: "interview-checklist.md",
        mimeType: "text/markdown",
        sizeBytes: 524288, // 512KB
        downloads: 1234,
        downloadSlug:
          "interview-list-" + Math.random().toString(36).substring(7),
        description: "完整面試準備指南，支援線上閱讀，可複製程式碼片段",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    // 為設計師添加線上可預覽的內容
    await prisma.file.create({
      data: {
        userId: 4,
        name: "Figma 設計教學影片課程",
        originalName: "figma-tutorial-course.mp4",
        filename: "figma-tutorial-course.mp4",
        mimeType: "video/mp4",
        sizeBytes: 157286400, // 150MB
        downloads: 678,
        downloadSlug: "figma-video-" + Math.random().toString(36).substring(7),
        description: "4小時 Figma 從入門到精通，線上觀看學習設計技巧",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 4,
        name: "UI設計原則電子書",
        originalName: "ui-design-principles.pdf",
        filename: "ui-design-principles.pdf",
        mimeType: "application/pdf",
        sizeBytes: 15728640, // 15MB
        downloads: 2341,
        downloadSlug:
          "ui-principles-" + Math.random().toString(36).substring(7),
        description: "150頁設計原則指南，線上閱讀，包含豐富案例和配色方案",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 4,
        name: "2024設計趋势分析报告",
        originalName: "design-trends-2024.html",
        filename: "design-trends-2024.html",
        mimeType: "text/html",
        sizeBytes: 2097152, // 2MB
        downloads: 567,
        downloadSlug: "trends-2024-" + Math.random().toString(36).substring(7),
        description: "互動式線上報告，包含動畫效果和案例展示，支援線上瀏覽",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    // 為數據分析師添加線上可預覽的內容
    await prisma.file.create({
      data: {
        userId: 5,
        name: "Python數據分析實戰影片",
        originalName: "python-data-analysis.mp4",
        filename: "python-data-analysis.mp4",
        mimeType: "video/mp4",
        sizeBytes: 209715200, // 200MB
        downloads: 1123,
        downloadSlug: "python-video-" + Math.random().toString(36).substring(7),
        description: "8小時完整課程影片，線上觀看學習數據處理技巧",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 5,
        name: "商業分析案例集 - 線上版",
        originalName: "business-analysis-cases.pdf",
        filename: "business-analysis-cases.pdf",
        mimeType: "application/pdf",
        sizeBytes: 20971520, // 20MB
        downloads: 890,
        downloadSlug: "biz-cases-" + Math.random().toString(36).substring(7),
        description: "25個真實商業案例分析，支援線上閱讀，包含互動圖表",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 5,
        name: "數據視覺化互動教程",
        originalName: "data-viz-tutorial.html",
        filename: "data-viz-tutorial.html",
        mimeType: "text/html",
        sizeBytes: 5242880, // 5MB
        downloads: 445,
        downloadSlug:
          "dataviz-tutorial-" + Math.random().toString(36).substring(7),
        description: "互動式線上教程，包含可執行的程式碼和即時圖表生成",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    console.log("✅ 成功添加線上預覽內容！");
    console.log("");
    console.log("🎬 現在平台支援多種線上閱讀和觀看方式：");
    console.log("📺 影片內容 - MP4格式，支援線上播放");
    console.log("📖 電子書 - PDF格式，支援線上閱讀");
    console.log("📝 文章 - Markdown/HTML格式，支援線上瀏覽");
    console.log("🔗 互動內容 - HTML格式，包含動態效果");
    console.log("");
    console.log("👥 現在使用者可以：");
    console.log("✅ 線上觀看教學影片");
    console.log("✅ 線上閱讀電子書和文檔");
    console.log("✅ 瀏覽互動式教程");
    console.log("✅ 下載離線使用");
    console.log("");
    console.log("🌐 查看更新後的使用者頁面：");
    console.log("- http://localhost:3000/user/1 (影片+電子書+文檔)");
    console.log("- http://localhost:3000/user/4 (設計課程+互動報告)");
    console.log("- http://localhost:3000/user/5 (數據分析影片+案例)");

    await prisma.$disconnect();
  } catch (error) {
    console.error("添加線上預覽內容失敗:", error.message);
    await prisma.$disconnect();
  }
}

addOnlinePreviewContent();
