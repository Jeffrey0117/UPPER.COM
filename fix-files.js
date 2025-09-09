import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixExistingFiles() {
  console.log("開始修復現有檔案的 downloadSlug...");

  // 尋找沒有 downloadSlug 的創建檔案
  const filesWithoutSlug = await prisma.file.findMany({
    where: {
      isCreated: true,
      downloadSlug: null,
    },
  });

  console.log(`找到 ${filesWithoutSlug.length} 個需要修復的檔案`);

  for (const file of filesWithoutSlug) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const downloadSlug = `download-${timestamp}-${randomString}`;

    await prisma.file.update({
      where: { id: file.id },
      data: { downloadSlug: downloadSlug },
    });

    console.log(`修復檔案: ${file.name} -> ${downloadSlug}`);
  }

  console.log("修復完成！");
  await prisma.$disconnect();
}

fixExistingFiles().catch(console.error);
