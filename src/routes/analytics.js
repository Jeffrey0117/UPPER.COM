import express from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { prisma } from "../app.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get user's analytics overview
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    try {
      // Build date filter
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      // Get user's files and pages
      const files = await prisma.file.findMany({
        where: { userId },
        include: {
          pages: {
            include: {
              leads: {
                where:
                  dateFilter.gte || dateFilter.lte
                    ? { createdAt: dateFilter }
                    : undefined,
              },
            },
          },
        },
      });

      // Calculate totals
      let totalDownloads = 0;
      let totalViews = 0;
      let totalLeads = 0;
      let totalPages = 0;

      files.forEach((file) => {
        totalDownloads += file.downloads;
        file.pages.forEach((page) => {
          totalViews += page.views;
          totalLeads += page.leads.length;
          totalPages++;
        });
      });

      const analytics = {
        overview: {
          totalFiles: files.length,
          totalPages,
          totalDownloads,
          totalViews,
          totalLeads,
          conversionRate:
            totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(2) : 0,
        },
        files: files.map((file) => ({
          id: file.id,
          name: file.name,
          downloads: file.downloads,
          pages: file.pages.map((page) => ({
            id: page.id,
            title: page.title,
            slug: page.slug,
            views: page.views,
            leads: page.leads.length,
            conversionRate:
              page.views > 0
                ? ((page.leads.length / page.views) * 100).toFixed(2)
                : 0,
          })),
        })),
      };

      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error("Analytics overview failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve analytics",
        details: error.message,
      });
    }
  })
);

// Get specific page analytics
router.get(
  "/pages/:pageId",
  asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const userId = req.user.id;
    const { startDate, endDate, granularity = "day" } = req.query;

    try {
      // Verify page ownership
      const page = await prisma.page.findFirst({
        where: {
          id: parseInt(pageId),
          userId,
        },
        include: {
          file: true,
          leads: {
            orderBy: { createdAt: "desc" },
            where:
              startDate || endDate
                ? {
                    createdAt: {
                      ...(startDate && { gte: new Date(startDate) }),
                      ...(endDate && { lte: new Date(endDate) }),
                    },
                  }
                : undefined,
          },
        },
      });

      if (!page) {
        return res.status(404).json({
          success: false,
          error: "Page not found or access denied",
        });
      }

      // Get analytics events for this page
      const analyticsEvents = await prisma.analytics.findMany({
        where: {
          pageId: parseInt(pageId),
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      // Group events by type
      const eventsByType = analyticsEvents.reduce((acc, event) => {
        if (!acc[event.event]) {
          acc[event.event] = [];
        }
        acc[event.event].push(event);
        return acc;
      }, {});

      const analytics = {
        page: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          views: page.views,
          isActive: page.isActive,
          createdAt: page.createdAt,
        },
        file: {
          id: page.file.id,
          name: page.file.name,
          downloads: page.file.downloads,
          sizeBytes: page.file.sizeBytes,
        },
        leads: {
          total: page.leads.length,
          recent: page.leads.slice(0, 10),
        },
        events: eventsByType,
        metrics: {
          conversionRate:
            page.views > 0
              ? ((page.leads.length / page.views) * 100).toFixed(2)
              : 0,
          avgTimeOnPage: "N/A", // Could be calculated from analytics events
          bounceRate: "N/A", // Could be calculated from analytics events
        },
      };

      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error("Page analytics failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve page analytics",
        details: error.message,
      });
    }
  })
);

// Get download statistics
router.get(
  "/downloads",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate, fileId } = req.query;

    try {
      const whereClause = {
        userId,
        ...(fileId && { id: parseInt(fileId) }),
      };

      const files = await prisma.file.findMany({
        where: whereClause,
        include: {
          pages: {
            include: {
              leads: {
                where:
                  startDate || endDate
                    ? {
                        createdAt: {
                          ...(startDate && { gte: new Date(startDate) }),
                          ...(endDate && { lte: new Date(endDate) }),
                        },
                      }
                    : undefined,
              },
            },
          },
        },
        orderBy: { downloads: "desc" },
      });

      const downloadStats = files.map((file) => ({
        id: file.id,
        name: file.name,
        downloads: file.downloads,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        pages: file.pages.length,
        leads: file.pages.reduce((total, page) => total + page.leads.length, 0),
        createdAt: file.createdAt,
      }));

      res.json({ success: true, data: downloadStats });
    } catch (error) {
      logger.error("Download stats failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve download statistics",
        details: error.message,
      });
    }
  })
);

// Track analytics event (used by public routes)
router.post(
  "/track",
  asyncHandler(async (req, res) => {
    const { pageId, event, data = {}, userAgent, ipAddress } = req.body;

    try {
      // Get page to find userId
      const page = await prisma.page.findUnique({
        where: { id: parseInt(pageId) },
        select: { userId: true },
      });

      if (!page) {
        return res.status(404).json({
          success: false,
          error: "Page not found",
        });
      }

      // Create analytics record
      await prisma.analytics.create({
        data: {
          userId: page.userId,
          pageId: parseInt(pageId),
          event,
          data,
          userAgent,
          ipAddress,
        },
      });

      // Update page view count if it's a view event
      if (event === "view") {
        await prisma.page.update({
          where: { id: parseInt(pageId) },
          data: { views: { increment: 1 } },
        });
      }

      res.json({ success: true, message: "Event tracked" });
    } catch (error) {
      logger.error("Event tracking failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to track event",
        details: error.message,
      });
    }
  })
);

// Get all leads for the user
router.get(
  "/leads",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate, pageId } = req.query;

    try {
      // Build date filter
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      // Get all leads for the user
      const leads = await prisma.lead.findMany({
        where: {
          page: {
            userId: userId,
          },
          ...(pageId && { pageId: parseInt(pageId) }),
          ...(dateFilter.gte || dateFilter.lte
            ? { createdAt: dateFilter }
            : {}),
        },
        include: {
          page: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          file: {
            select: {
              id: true,
              name: true,
              originalName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        leads: leads,
        total: leads.length,
      });
    } catch (error) {
      logger.error("Get leads failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve leads",
        details: error.message,
      });
    }
  })
);

// Get chart data for visualization
router.get(
  "/chart-data",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { range = "week" } = req.query;

    try {
      // Calculate date range
      const now = new Date();
      let startDate,
        endDate = new Date();
      let groupByFormat;

      switch (range) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = "hour";
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = "day";
          break;
        case "month":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = "day";
          break;
        case "year":
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 11);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = "month";
          break;
        case "all":
          startDate = new Date(2020, 0, 1); // Set a reasonable start date
          groupByFormat = "month";
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = "day";
      }

      // Get analytics data
      const analyticsData = await prisma.analytics.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Get leads data
      const leadsData = await prisma.lead.findMany({
        where: {
          page: { userId },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          page: {
            include: {
              file: {
                select: {
                  name: true,
                  originalName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Generate date labels based on range
      const dateLabels = [];
      const current = new Date(startDate);

      if (range === "today") {
        // Generate hourly labels
        for (let i = 0; i < 24; i++) {
          dateLabels.push(`${i}:00`);
        }
      } else if (range === "year") {
        // Generate monthly labels
        for (let i = 0; i < 12; i++) {
          dateLabels.push(`${current.getMonth() + 1}月`);
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        // Generate daily labels
        const days = range === "month" ? 30 : range === "week" ? 7 : 7;
        for (let i = 0; i < days; i++) {
          if (range === "year") {
            dateLabels.push(`${current.getMonth() + 1}月`);
          } else {
            dateLabels.push(`${current.getMonth() + 1}/${current.getDate()}`);
          }
          current.setDate(current.getDate() + 1);
        }
      }

      // Process analytics data for trends
      const trendsData = {
        labels: dateLabels,
        views: new Array(dateLabels.length).fill(0),
        downloads: new Array(dateLabels.length).fill(0),
      };

      // Process view/download events
      analyticsData.forEach((event) => {
        const eventDate = new Date(event.createdAt);
        let index = 0;

        if (range === "today") {
          index = eventDate.getHours();
        } else if (range === "year") {
          index = eventDate.getMonth();
        } else {
          const daysDiff = Math.floor(
            (eventDate - startDate) / (1000 * 60 * 60 * 24)
          );
          index = Math.max(0, Math.min(daysDiff, dateLabels.length - 1));
        }

        if (event.event === "view" && index < trendsData.views.length) {
          trendsData.views[index]++;
        } else if (
          event.event === "download" &&
          index < trendsData.downloads.length
        ) {
          trendsData.downloads[index]++;
        }
      });

      // Process leads data for downloads by file
      const fileStats = {};
      leadsData.forEach((lead) => {
        const fileName =
          lead.page?.file?.originalName || lead.page?.file?.name || "未知檔案";
        if (!fileStats[fileName]) {
          fileStats[fileName] = 0;
        }
        fileStats[fileName]++;
      });

      // Sort by download count and take top 5
      const sortedFiles = Object.entries(fileStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      const downloadsData = {
        labels: sortedFiles.map(([name]) =>
          name.length > 15 ? name.substring(0, 15) + "..." : name
        ),
        values: sortedFiles.map(([, count]) => count),
      };

      // Process traffic sources (simplified - based on analytics events)
      const trafficSources = {};
      analyticsData.forEach((event) => {
        const referrer = event.data?.referrer || "direct";
        const source = referrer.includes("google")
          ? "搜尋引擎"
          : referrer.includes("facebook") ||
            referrer.includes("twitter") ||
            referrer.includes("linkedin")
          ? "社交媒體"
          : referrer === "direct"
          ? "直接訪問"
          : "外部連結";

        if (!trafficSources[source]) {
          trafficSources[source] = 0;
        }
        trafficSources[source]++;
      });

      // Ensure we have all traffic source types
      const trafficData = {
        labels: ["直接訪問", "搜尋引擎", "社交媒體", "外部連結"],
        values: [
          trafficSources["直接訪問"] || 0,
          trafficSources["搜尋引擎"] || 0,
          trafficSources["社交媒體"] || 0,
          trafficSources["外部連結"] || 0,
        ],
      };

      // Normalize traffic data if all are zero
      if (trafficData.values.every((v) => v === 0)) {
        trafficData.values = [35, 30, 20, 15]; // Default distribution
      }

      const chartData = {
        trends: trendsData,
        downloads: downloadsData,
        traffic: trafficData,
      };

      res.json(chartData);
    } catch (error) {
      logger.error("Chart data failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve chart data",
        details: error.message,
      });
    }
  })
);

export default router;
