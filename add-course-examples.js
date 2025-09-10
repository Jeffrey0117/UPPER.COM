import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addCourseExamples() {
  try {
    console.log("正在添加課程和知識包範例...");

    // 更新使用者資料為更適合的角色
    await prisma.user.update({
      where: { id: 1 },
      data: {
        name: "李老師",
        bio: "📚 程式設計講師 | 10年開發經驗 | 專精JavaScript、React | 已幫助1000+學生入門程式設計",
        company: "Code Academy Taiwan",
        location: "台北, 台灣",
        website: "https://codeteacher.tw",
      },
    });

    await prisma.user.update({
      where: { id: 4 },
      data: {
        name: "設計師小美",
        bio: "🎨 資深UI/UX設計師 | Adobe認證講師 | 分享實戰設計技巧和免費模板資源",
        company: "Design Studio Pro",
        location: "台中, 台灣",
        website: "https://uiux-master.com",
      },
    });

    await prisma.user.update({
      where: { id: 5 },
      data: {
        name: "數據分析師王大明",
        bio: "📊 數據科學專家 | Python教學 | 商業分析顧問 | 讓數據說話的藝術家",
        company: "Data Insights Lab",
        location: "新竹, 台灣",
        website: "https://data-master.tw",
      },
    });

    // 清除舊檔案
    await prisma.file.deleteMany({
      where: { userId: { in: [1, 4, 5] } },
    });

    // 為程式設計講師添加課程資料包
    await prisma.file.create({
      data: {
        userId: 1,
        name: "JavaScript 從零到一完整課程包",
        originalName: "javascript-complete-course.zip",
        filename: "javascript-complete-course.zip",
        mimeType: "application/zip",
        sizeBytes: 25165824, // 24MB
        downloads: 342,
        downloadSlug: "js-course-" + Math.random().toString(36).substring(7),
        description: "包含12章節課程筆記、30個實戰練習、完整程式碼範例",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 1,
        name: "React Hooks 實戰筆記.pdf",
        originalName: "react-hooks-notes.pdf",
        filename: "react-hooks-notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: 5242880, // 5MB
        downloads: 198,
        downloadSlug: "react-notes-" + Math.random().toString(36).substring(7),
        description: "120頁精華筆記，包含useState、useEffect、自定義Hook等",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 1,
        name: "面試題庫大全.json",
        originalName: "interview-questions.json",
        filename: "interview-questions.json",
        mimeType: "application/json",
        sizeBytes: 1048576, // 1MB
        downloads: 456,
        downloadSlug: "interview-" + Math.random().toString(36).substring(7),
        description: "300道前端面試題目+詳解，求職必備",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    // 為設計師添加設計資源包
    await prisma.file.create({
      data: {
        userId: 4,
        name: "2024 UI設計趨勢報告+模板包",
        originalName: "ui-trends-2024.zip",
        filename: "ui-trends-2024.zip",
        mimeType: "application/zip",
        sizeBytes: 52428800, // 50MB
        downloads: 567,
        downloadSlug: "ui-trends-" + Math.random().toString(36).substring(7),
        description: "包含50+設計模板、色彩方案、字體搭配指南",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 4,
        name: "Figma 高效設計流程筆記.pdf",
        originalName: "figma-workflow.pdf",
        filename: "figma-workflow.pdf",
        mimeType: "application/pdf",
        sizeBytes: 8388608, // 8MB
        downloads: 289,
        downloadSlug: "figma-flow-" + Math.random().toString(36).substring(7),
        description: "從概念到原型的完整Figma工作流程，提升10倍效率",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 4,
        name: "免費圖標包庫.png",
        originalName: "icon-pack.png",
        filename: "icon-pack.png",
        mimeType: "image/png",
        sizeBytes: 15728640, // 15MB
        downloads: 892,
        downloadSlug: "icons-" + Math.random().toString(36).substring(7),
        description: "1000+精美圖標，支援SVG格式，可商用",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    // 為數據分析師添加分析課程包
    await prisma.file.create({
      data: {
        userId: 5,
        name: "Python數據分析實戰課程",
        originalName: "python-data-analysis.zip",
        filename: "python-data-analysis.zip",
        mimeType: "application/zip",
        sizeBytes: 41943040, // 40MB
        downloads: 234,
        downloadSlug: "python-data-" + Math.random().toString(36).substring(7),
        description: "8週完整課程：Pandas、NumPy、Matplotlib實戰項目",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 5,
        name: "Excel自動化模板集.xlsx",
        originalName: "excel-automation.xlsx",
        filename: "excel-automation.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: 2097152, // 2MB
        downloads: 445,
        downloadSlug: "excel-auto-" + Math.random().toString(36).substring(7),
        description: "20個自動化Excel模板，告別重複工作",
        isActive: true,
        isCreated: false,
        isPublic: true,
      },
    });

    await prisma.file.create({
      data: {
        userId: 5,
        name: "商業數據視覺化案例.pdf",
        originalName: "data-viz-cases.pdf",
        filename: "data-viz-cases.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12582912, // 12MB
        downloads: 167,
        downloadSlug: "dataviz-" + Math.random().toString(36).substring(7),
        description: "15個真實商業案例，從數據到洞察的完整流程",
        isActive: true,
        isCreated: true,
        isPublic: true,
      },
    });

    console.log("✅ 成功添加課程範例！");
    console.log("");
    console.log("🎓 現在平台展示了真正的知識變現場景：");
    console.log("- http://localhost:3000/user/1 (程式設計課程講師)");
    console.log("- http://localhost:3000/user/4 (UI/UX設計師資源分享)");
    console.log("- http://localhost:3000/user/5 (數據分析專家)");
    console.log("");
    console.log("💡 每位創作者都能輕鬆將專業知識打包成：");
    console.log("📚 完整課程包 (ZIP格式包含多個檔案)");
    console.log("📝 精華筆記 (PDF格式易於閱讀)");
    console.log("🛠️ 實用工具/模板 (直接可用的資源)");
    console.log("📊 案例分析 (實戰經驗分享)");

    await prisma.$disconnect();
  } catch (error) {
    console.error("添加課程範例失敗:", error.message);
    await prisma.$disconnect();
  }
}

addCourseExamples();
