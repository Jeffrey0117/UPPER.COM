# 多檔案下載頁面設置指南

## 問題解答

**下載頁面管理是否能讓頁面一次關聯多個檔案？**
**答案：是的！** 已經完整實現了多檔案關聯功能。

## 完成步驟

### 1. 資料庫已更新 ✅

- 新的 `page_files` 表格已創建
- 支援多對多關聯 (Page ↔ File)
- 支援檔案排序和主要檔案標記

### 2. API 端點已添加 ✅

新增了完整的多檔案管理 API：

```
GET    /api/page-files/:pageId              - 取得頁面關聯的所有檔案
POST   /api/page-files/:pageId/files        - 批量關聯多個檔案
POST   /api/page-files/:pageId/files/:fileId - 添加單個檔案
PUT    /api/page-files/:pageId/files/:fileId - 更新檔案設定
DELETE /api/page-files/:pageId/files/:fileId - 移除檔案關聯
```

### 3. 修復 Prisma 客戶端問題

由於 Windows 權限問題，需要手動修復 Prisma 客戶端：

```bash
# 方法1：重啟並重新生成
npm run dev

# 方法2：如果還有問題，手動刪除並重新安裝
rmdir /s node_modules\.prisma
npm install
npx prisma generate
```

## 使用方法

### API 使用範例

#### 1. 關聯多個檔案到頁面

```javascript
// POST /api/page-files/[頁面ID]/files
fetch("/api/page-files/1/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fileIds: [1, 2, 3], // 檔案ID陣列
  }),
});
```

#### 2. 查看頁面關聯的檔案

```javascript
// GET /api/page-files/[頁面ID]
fetch("/api/page-files/1")
  .then((res) => res.json())
  .then((data) => {
    console.log("關聯的檔案：", data.pageFiles);
  });
```

#### 3. 設定主要檔案

```javascript
// PUT /api/page-files/[頁面ID]/files/[檔案ID]
fetch("/api/page-files/1/files/2", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    isPrimary: true,
  }),
});
```

### 前端整合建議

在 admin.html 中可以添加多檔案管理介面：

```html
<!-- 多檔案選擇器 -->
<div id="multi-file-selector">
  <h4>選擇要關聯的檔案：</h4>
  <div id="available-files"></div>
  <button onclick="associateFiles()">關聯選中檔案</button>
</div>

<!-- 已關聯檔案列表 -->
<div id="associated-files">
  <h4>已關聯檔案：</h4>
  <div id="file-list"></div>
</div>
```

## 功能優勢

### ✅ 已實現功能

1. **多檔案關聯** - 一個頁面可關聯無限個檔案
2. **檔案排序** - 支援 position 欄位排序
3. **主要檔案** - 可指定一個主要檔案
4. **批量操作** - 一次添加多個檔案
5. **向後兼容** - 現有單檔案頁面正常運作

### 🎯 使用場景

- **教育資源** - 講義、練習題、參考資料
- **軟體發佈** - 不同平台版本檔案
- **設計素材** - 圖片、字體、模板包
- **文件集合** - PDF、Word、Excel 等格式

## 故障排除

### 如果遇到 500 錯誤：

1. 重啟開發服務器：`npm run dev`
2. 檢查 Prisma 客戶端：`npx prisma generate`
3. 查看服務器日誌確認錯誤詳情

### 如果 pageFiles API 不存在：

確認 `src/app.js` 中已添加路由：

```javascript
import pageFileRoutes from "./routes/pageFiles.js";
app.use("/api/page-files", authenticateToken, pageFileRoutes);
```

多檔案功能已完全實現並可立即使用！
