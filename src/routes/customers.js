import express from "express";
import { PrismaClient } from "@prisma/client";
import { Parser } from "json2csv";

const router = express.Router();
const prisma = new PrismaClient();

// 獲取客戶列表（支援分頁、搜尋、篩選）
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 建立查詢條件
    const where = {};

    // 搜尋條件（名稱、Email、公司）
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }

    // 狀態篩選
    if (status) {
      where.status = status;
    }

    // 查詢客戶資料
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("獲取客戶列表失敗:", error);
    res.status(500).json({
      success: false,
      error: "獲取客戶列表失敗",
    });
  }
});

// 獲取單一客戶
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "找不到該客戶",
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("獲取客戶資料失敗:", error);
    res.status(500).json({
      success: false,
      error: "獲取客戶資料失敗",
    });
  }
});

// 新增客戶
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, company, notes, status } = req.body;

    // 驗證必填欄位
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "名稱和 Email 為必填欄位",
      });
    }

    // 檢查 Email 是否已存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: "此 Email 已被使用",
      });
    }

    // 建立客戶
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        status: status || "potential",
      },
    });

    res.status(201).json({
      success: true,
      customer,
      message: "客戶建立成功",
    });
  } catch (error) {
    console.error("建立客戶失敗:", error);
    res.status(500).json({
      success: false,
      error: "建立客戶失敗",
    });
  }
});

// 更新客戶
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, notes, status } = req.body;

    // 檢查客戶是否存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: "找不到該客戶",
      });
    }

    // 如果要更新 Email，檢查是否重複
    if (email && email !== existingCustomer.email) {
      const emailExists = await prisma.customer.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: "此 Email 已被使用",
        });
      }
    }

    // 更新客戶資料
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: name || existingCustomer.name,
        email: email || existingCustomer.email,
        phone: phone !== undefined ? phone : existingCustomer.phone,
        company: company !== undefined ? company : existingCustomer.company,
        notes: notes !== undefined ? notes : existingCustomer.notes,
        status: status || existingCustomer.status,
      },
    });

    res.json({
      success: true,
      customer,
      message: "客戶更新成功",
    });
  } catch (error) {
    console.error("更新客戶失敗:", error);
    res.status(500).json({
      success: false,
      error: "更新客戶失敗",
    });
  }
});

// 刪除客戶
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查客戶是否存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: "找不到該客戶",
      });
    }

    // 刪除客戶
    await prisma.customer.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "客戶刪除成功",
    });
  } catch (error) {
    console.error("刪除客戶失敗:", error);
    res.status(500).json({
      success: false,
      error: "刪除客戶失敗",
    });
  }
});

// 匯出客戶為 CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { status } = req.query;

    // 建立查詢條件
    const where = {};
    if (status) {
      where.status = status;
    }

    // 獲取所有客戶
    const customers = await prisma.customer.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // 轉換資料格式
    const csvData = customers.map((customer) => ({
      ID: customer.id,
      名稱: customer.name,
      Email: customer.email,
      電話: customer.phone || "",
      公司: customer.company || "",
      狀態:
        customer.status === "potential"
          ? "潛在客戶"
          : customer.status === "active"
          ? "活躍客戶"
          : "非活躍客戶",
      備註: customer.notes || "",
      建立時間: new Date(customer.createdAt).toLocaleString("zh-TW"),
      更新時間: new Date(customer.updatedAt).toLocaleString("zh-TW"),
    }));

    // 設定 CSV 欄位
    const fields = [
      "ID",
      "名稱",
      "Email",
      "電話",
      "公司",
      "狀態",
      "備註",
      "建立時間",
      "更新時間",
    ];
    const json2csvParser = new Parser({ fields, withBOM: true });
    const csv = json2csvParser.parse(csvData);

    // 設定回應標頭
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="customers_${Date.now()}.csv"`
    );

    res.send(csv);
  } catch (error) {
    console.error("匯出客戶失敗:", error);
    res.status(500).json({
      success: false,
      error: "匯出客戶失敗",
    });
  }
});

export default router;
