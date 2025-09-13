import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createSimpleTestData() {
  try {
    console.log("🧪 創建簡化的測試數據...\n");

    // 檢查現有用戶
    const users = await prisma.user.findMany();
    if (users.length === 0) {
      console.log("❌ 沒有找到用戶，請先創建用戶");
      return;
    }

    const userId = users[0].id;
    console.log(`📊 為用戶 ${userId} 創建測試數據`);

    // 創建測試檔案
    console.log("📁 創建測試檔案...");
    const testFiles = [
      {
        name: "product-manual.pdf",
        originalName: "產品手冊.pdf",
        downloads: 45,
        sizeBytes: 2048576,
        mimeType: "application/pdf",
      },
      {
        name: "user-guide.docx",
        originalName: "使用指南.docx",
        downloads: 32,
        sizeBytes: 1024000,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      {
        name: "price-list.xlsx",
        originalName: "價格表.xlsx",
        downloads: 28,
        sizeBytes: 512000,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        name: "demo-video.mp4",
        originalName: "示範影片.mp4",
        downloads: 20,
        sizeBytes: 10485760,
        mimeType: "video/mp4",
      },
      {
        name: "software-setup.zip",
        originalName: "軟體安裝包.zip",
        downloads: 15,
        sizeBytes: 5242880,
        mimeType: "application/zip",
      },
    ];

    const createdFiles = [];
    for (const fileData of testFiles) {
      const file = await prisma.file.create({
        data: {
          userId,
          ...fileData,
          storageKey: `test-${Date.now()}-${fileData.name}`,
          isActive: true,
        },
      });
      createdFiles.push(file);
      console.log(`  ✓ 創建檔案: ${file.originalName}`);
    }

    // 創建測試頁面
    console.log("\n📄 創建測試頁面...");
    const testPages = [
      { title: "免費產品手冊下載", slug: "product-manual", views: 150 },
      { title: "詳細使用指南", slug: "user-guide", views: 120 },
      { title: "最新價格表", slug: "price-list", views: 95 },
      { title: "產品示範影片", slug: "demo-video", views: 80 },
      { title: "軟體安裝指南", slug: "software-install", views: 65 },
    ];

    const createdPages = [];
    for (let i = 0; i < testPages.length; i++) {
      const page = await prisma.page.create({
        data: {
          userId,
          fileId: createdFiles[i].id,
          ...testPages[i],
          description: `${testPages[i].title} - 專業內容`,
          isActive: true,
        },
      });
      createdPages.push(page);
      console.log(`  ✓ 創建頁面: ${page.title}`);
    }

    // 創建測試潛在客戶
    console.log("\n👥 創建測試潛在客戶...");
    const testLeads = [
      { email: "test1@example.com", ipAddress: "192.168.1.100" },
      { email: "test2@example.com", ipAddress: "192.168.1.101" },
      { email: "test3@example.com", ipAddress: "192.168.1.102" },
      { email: "test4@example.com", ipAddress: "192.168.1.103" },
      { email: "test5@example.com", ipAddress: "192.168.1.104" },
      { email: "test6@example.com", ipAddress: "192.168.1.105" },
      { email: "test7@example.com", ipAddress: "192.168.1.106" },
      { email: "test8@example.com", ipAddress: "192.168.1.107" },
    ];

    const createdLeads = [];
    for (let i = 0; i < testLeads.length; i++) {
      const page = createdPages[i % createdPages.length];
      const lead = await prisma.lead.create({
        data: {
          pageId: page.id,
          ...testLeads[i],
        },
      });
      createdLeads.push(lead);
    }
    console.log(`  ✓ 創建了 ${createdLeads.length} 個測試潛在客戶`);

    // 最終統計
    console.log("\n🎉 測試數據創建完成！");
    console.log("===============================");

    const finalPages = await prisma.page.findMany({
      where: { userId },
      include: {
        file: true,
        _count: { select: { leads: true } },
      },
    });

    const totalViews = finalPages.reduce((sum, page) => sum + page.views, 0);
    const totalDownloads = finalPages.reduce(
      (sum, page) => sum + (page.file?.downloads || 0),
      0
    );
    const totalLeads = finalPages.reduce(
      (sum, page) => sum + page._count.leads,
      0
    );

    console.log(`📊 統計數據:`);
    console.log(`   總訪問量: ${totalViews}`);
    console.log(`   總下載量: ${totalDownloads}`);
    console.log(`   總潛在客戶: ${totalLeads}`);
    console.log(
      `   轉換率: ${
        totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(2) : 0
      }%`
    );

    console.log("\n💡 現在您可以重新整理管理後台的數據分析頁面來查看圖表！");
  } catch (error) {
    console.error("❌ 創建測試數據失敗:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSimpleTestData();
