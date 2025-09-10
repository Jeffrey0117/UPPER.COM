import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addSampleFiles() {
  try {
    console.log("正在為使用者添加範例檔案...");

    // 為 ID 1 的使用者 (Test User) 添加範例檔案
    const file1 = await prisma.file.create({
      data: {
        userId: 1,
        name: "JavaScript 學習指南.pdf",
        originalName: "javascript-guide.pdf",
        filename: "javascript-guide.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048000, // 2MB
        downloads: 127,
        downloadSlug: "js-guide-" + Math.random().toString(36).substring(7),
        description: "完整的 JavaScript 學習資源",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    const file2 = await prisma.file.create({
      data: {
        userId: 1,
        name: "React 最佳實踐.json",
        originalName: "react-best-practices.json",
        filename: "react-best-practices.json",
        mimeType: "application/json",
        sizeBytes: 524288, // 512KB
        downloads: 89,
        downloadSlug: "react-bp-" + Math.random().toString(36).substring(7),
        description: "React 開發最佳實踐配置檔案",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    // 為 ID 4 的使用者 (示範用戶) 添加範例檔案
    const file3 = await prisma.file.create({
      data: {
        userId: 4,
        name: "網站設計模板.zip",
        originalName: "website-templates.zip",
        filename: "website-templates.zip",
        mimeType: "application/zip",
        sizeBytes: 15728640, // 15MB
        downloads: 234,
        downloadSlug:
          "web-templates-" + Math.random().toString(36).substring(7),
        description: "現代化網站設計模板包",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    const file4 = await prisma.file.create({
      data: {
        userId: 4,
        name: "色彩搭配指南.png",
        originalName: "color-guide.png",
        filename: "color-guide.png",
        mimeType: "image/png",
        sizeBytes: 3145728, // 3MB
        downloads: 156,
        downloadSlug: "color-guide-" + Math.random().toString(36).substring(7),
        description: "專業色彩搭配參考圖",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    // 為 ID 5 的使用者 (開發者) 添加範例檔案
    const file5 = await prisma.file.create({
      data: {
        userId: 5,
        name: "API 文檔.md",
        originalName: "api-documentation.md",
        filename: "api-documentation.md",
        mimeType: "text/markdown",
        sizeBytes: 81920, // 80KB
        downloads: 67,
        downloadSlug: "api-docs-" + Math.random().toString(36).substring(7),
        description: "完整的 API 使用說明文檔",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    const file6 = await prisma.file.create({
      data: {
        userId: 5,
        name: "數據庫結構.sql",
        originalName: "database-schema.sql",
        filename: "database-schema.sql",
        mimeType: "application/sql",
        sizeBytes: 12288, // 12KB
        downloads: 43,
        downloadSlug: "db-schema-" + Math.random().toString(36).substring(7),
        description: "資料庫結構設計檔案",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    // 同時更新使用者的個人資料
    await prisma.user.update({
      where: { id: 1 },
      data: {
        bio: "前端開發工程師，專精於 React 和 JavaScript 技術。分享實用的程式設計資源和學習心得。",
        company: "Tech Solutions Inc.",
        location: "台北, 台灣",
        website: "https://techdev.example.com",
      },
    });

    await prisma.user.update({
      where: { id: 4 },
      data: {
        bio: "UI/UX 設計師 🎨 專注於創造美觀且實用的使用者體驗。提供免費設計資源和模板下載。",
        company: "Creative Studio",
        location: "台中, 台灣",
        website: "https://design.example.com",
      },
    });

    await prisma.user.update({
      where: { id: 5 },
      data: {
        bio: "全端開發者 💻 熱愛開源技術，致力於分享技術知識和最佳實踐。",
        company: "Open Source Labs",
        location: "高雄, 台灣",
        website: "https://devlabs.example.com",
      },
    });

    console.log("✅ 成功添加範例檔案！");
    console.log(`📁 已為 Test User (ID: 1) 添加 2 個檔案`);
    console.log(`📁 已為 示範用戶 (ID: 4) 添加 2 個檔案`);
    console.log(`📁 已為 開發者 (ID: 5) 添加 2 個檔案`);
    console.log("");
    console.log("🎉 現在您可以查看這些使用者頁面：");
    console.log("- http://localhost:3000/user/1 (前端開發工程師)");
    console.log("- http://localhost:3000/user/4 (UI/UX 設計師)");
    console.log("- http://localhost:3000/user/5 (全端開發者)");

    await prisma.$disconnect();
  } catch (error) {
    console.error("添加範例檔案失敗:", error.message);
    await prisma.$disconnect();
  }
}

addSampleFiles();
