import prisma from "./src/lib/prisma.js";

async function addTestData() {
  try {
    console.log("🧪 創建測試數據來展示數據統計功能...\n");

    // 獲取現有用戶
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
        name: "產品手冊.pdf",
        originalName: "產品手冊.pdf",
        downloads: 45,
        sizeBytes: 2048576,
      },
      {
        name: "使用指南.docx",
        originalName: "使用指南.docx",
        downloads: 32,
        sizeBytes: 1024000,
      },
      {
        name: "價格表.xlsx",
        originalName: "價格表.xlsx",
        downloads: 28,
        sizeBytes: 512000,
      },
      {
        name: "示範影片.mp4",
        originalName: "示範影片.mp4",
        downloads: 20,
        sizeBytes: 10485760,
      },
      {
        name: "軟體安裝包.zip",
        originalName: "軟體安裝包.zip",
        downloads: 15,
        sizeBytes: 5242880,
      },
    ];

    const createdFiles = [];
    for (const fileData of testFiles) {
      const file = await prisma.file.create({
        data: {
          userId,
          ...fileData,
          mimeType: "application/pdf",
          storageKey: `test-${Date.now()}-${fileData.name}`,
          isActive: true,
        },
      });
      createdFiles.push(file);
      console.log(
        `  ✓ 創建檔案: ${file.originalName} (下載量: ${file.downloads})`
      );
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
          description: `${testPages[i].title} - 專業的${createdFiles[i].originalName}下載`,
          isActive: true,
        },
      });
      createdPages.push(page);
      console.log(`  ✓ 創建頁面: ${page.title} (瀏覽量: ${page.views})`);
    }

    // 創建測試潛在客戶
    console.log("\n👥 創建測試潛在客戶...");
    const testLeads = [
      { email: "john@example.com", name: "John Smith" },
      { email: "sarah@example.com", name: "Sarah Johnson" },
      { email: "mike@example.com", name: "Mike Wilson" },
      { email: "lisa@example.com", name: "Lisa Brown" },
      { email: "david@example.com", name: "David Lee" },
      { email: "anna@example.com", name: "Anna Garcia" },
      { email: "tom@example.com", name: "Tom Anderson" },
      { email: "jane@example.com", name: "Jane Taylor" },
    ];

    const createdLeads = [];
    for (let i = 0; i < testLeads.length; i++) {
      const page = createdPages[i % createdPages.length];
      const lead = await prisma.lead.create({
        data: {
          pageId: page.id,
          ...testLeads[i],
          phone: "+1234567890",
          company: "測試公司",
          notes: `從頁面 ${page.title} 獲取的潛在客戶`,
        },
      });
      createdLeads.push(lead);
    }
    console.log(`  ✓ 創建了 ${createdLeads.length} 個測試潛在客戶`);

    // 創建測試 Analytics 事件
    console.log("\n📊 創建測試 Analytics 事件...");
    const analyticsEvents = [];
    const now = new Date();

    // 創建過去7天的測試數據
    for (let day = 6; day >= 0; day--) {
      const eventDate = new Date(now);
      eventDate.setDate(now.getDate() - day);

      // 每個頁面每天創建隨機的瀏覽事件
      for (const page of createdPages) {
        const viewCount = Math.floor(Math.random() * 20) + 5; // 5-25 個瀏覽量

        for (let j = 0; j < viewCount; j++) {
          const eventTime = new Date(eventDate);
          eventTime.setHours(Math.floor(Math.random() * 24));
          eventTime.setMinutes(Math.floor(Math.random() * 60));

          analyticsEvents.push({
            userId,
            pageId: page.id,
            event: "view",
            data: {
              referrer:
                j % 3 === 0
                  ? "direct"
                  : j % 3 === 1
                  ? "https://google.com"
                  : "https://facebook.com",
              userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            createdAt: eventTime,
          });
        }

        // 創建一些下載事件
        const downloadCount = Math.floor(Math.random() * 5) + 1; // 1-5 個下載
        for (let j = 0; j < downloadCount; j++) {
          const eventTime = new Date(eventDate);
          eventTime.setHours(Math.floor(Math.random() * 24));
          eventTime.setMinutes(Math.floor(Math.random() * 60));

          analyticsEvents.push({
            userId,
            pageId: page.id,
            event: "download",
            data: {
              fileId: page.fileId,
              referrer: "direct",
            },
            createdAt: eventTime,
          });
        }
      }
    }

    // 批量創建 analytics 事件
    const createdEvents = await prisma.analytics.createMany({
      data: analyticsEvents,
    });
    console.log(`  ✓ 創建了 ${createdEvents.count} 個測試 Analytics 事件`);

    // 更新頁面瀏覽量統計
    console.log("\n🔄 更新頁面統計...");
    for (const page of createdPages) {
      const viewEvents = analyticsEvents.filter(
        (e) => e.pageId === page.id && e.event === "view"
      );
      const downloadEvents = analyticsEvents.filter(
        (e) => e.pageId === page.id && e.event === "download"
      );

      await prisma.page.update({
        where: { id: page.id },
        data: {
          views: { increment: viewEvents.length },
        },
      });

      if (page.fileId) {
        await prisma.file.update({
          where: { id: page.fileId },
          data: {
            downloads: { increment: downloadEvents.length },
          },
        });
      }
    }
    console.log("  ✓ 頁面統計已更新");

    // 總結統計
    console.log("\n🎉 測試數據創建完成！");
    console.log("===============================");
    console.log(`📁 檔案數量: ${createdFiles.length}`);
    console.log(`📄 頁面數量: ${createdPages.length}`);
    console.log(`👥 潛在客戶數量: ${createdLeads.length}`);
    console.log(`📊 Analytics 事件數量: ${createdEvents.count}`);

    // 計算最終統計
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

    console.log("\n📈 最終統計數據:");
    console.log(`總訪問量: ${totalViews}`);
    console.log(`總下載量: ${totalDownloads}`);
    console.log(`總潛在客戶: ${totalLeads}`);
    console.log(
      `轉換率: ${
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

addTestData();
