import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixCreatedFilesIcons() {
  try {
    // Get all pages that belong to created files but don't have images
    const pages = await prisma.page.findMany({
      where: {
        file: {
          isCreated: true,
        },
        OR: [{ images: null }, { images: "" }, { images: "[]" }],
      },
      include: {
        file: true,
      },
    });

    console.log(`Found ${pages.length} created file pages without icons`);

    for (const page of pages) {
      if (page.file) {
        // Get file extension from filename
        let fileExtension = "file";
        if (page.file.name) {
          const parts = page.file.name.split(".");
          if (parts.length > 1) {
            fileExtension = parts[parts.length - 1].toLowerCase();
          }
        }

        // Update page with file type icon
        await prisma.page.update({
          where: { id: page.id },
          data: {
            images: JSON.stringify([`css-file-icon:${fileExtension}`]),
          },
        });

        console.log(`Updated page ${page.slug} with ${fileExtension} icon`);
      }
    }

    console.log("All created file pages updated with icons!");
  } catch (error) {
    console.error("Error updating pages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCreatedFilesIcons();
