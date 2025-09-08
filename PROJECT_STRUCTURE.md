# 專案檔案結構說明

## 📁 核心檔案架構

### 🌐 Public 前端檔案

- `admin.html` - 管理後台（主要功能）
- `index.html` - 主頁儀表板
- `login.html` - 正式登入頁面
- `dev-login.html` - 開發環境登入
- `quick-login.html` - 快速登入頁面
- `clear.html` - 清除登入數據工具
- `xiyi-download.html` - 下載頁模板
- `xiyi-edit.html` - 編輯頁模板
- `xiyi-back.html` - 後台頁模板

### 🔧 後端檔案

- `src/app.js` - 主應用程式
- `src/routes/` - API 路由
- `src/middleware/` - 中介軟體
- `src/utils/` - 工具函數
- `prisma/` - 資料庫設定

### 📄 文件檔案

- `README.md` - 專案說明
- `DEVELOPMENT_PROGRESS.md` - 開發進度
- `claude-platform-spec.md` - 專案規格
- `claude-platform-tests.md` - 測試規格

### 🗂️ 其他目錄

- `uploads/` - 檔案上傳目錄
- `logs/` - 日誌檔案
- `tests/` - 測試檔案
- `scripts/` - 腳本檔案

## 🧹 已清理的檔案

### 刪除的測試檔案：

- ❌ `index.html` (根目錄，舊版)
- ❌ `back.html` (舊版後台)
- ❌ `edit.html` (舊版編輯頁)
- ❌ `test-*.html` (測試頁面)
- ❌ `debug-test.html` (除錯頁面)
- ❌ `simple-test.html` (簡單測試)
- ❌ `dashboard-standalone.html` (獨立儀表板)
- ❌ `*.js` 測試腳本檔案

## 📊 專案狀態

- ✅ 核心功能完整
- ✅ 檔案結構清晰
- ✅ 測試檔案已清理
- ✅ 準備進入下一開發階段

## 🎯 下一步

1. 開發名單收集功能
2. 完善下載頁面系統
3. 準備部署到生產環境
