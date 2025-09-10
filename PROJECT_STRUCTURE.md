# 專案檔案結構說明

## 📁 核心檔案架構

### 🌐 Public 前端檔案

- `admin.html` - 管理後台（主要功能）
- `index.html` - 主頁儀表板
- `login.html` - 正式登入頁面
- `dev-login.html` - 開發環境登入
- `file-creator.html` - 線上檔案製作工具
- `download-success.html` - 下載成功頁面
- `bear.png` / `bear-big.png` - 範例圖片檔案
- `fix-test.md` - 測試文檔
- `css/dashboard.css` - 統一樣式系統

### 🔧 後端檔案

- `src/app.js` - 主應用程式
- `src/routes/` - API 路由
  - `auth.js` - 認證系統
  - `files.js` - 檔案管理
  - `pages.js` - 頁面建立
  - `fileCreator.js` - 檔案製作工具
  - `analytics.js` - 數據分析
  - `profile.js` - 用戶個人檔案
  - `images.js` - 圖片管理
  - `public.js` - 公開路由
- `src/middleware/` - 中介軟體
  - `auth.js` - JWT 認證
  - `errorHandler.js` - 錯誤處理
- `src/utils/` - 工具函數
  - `logger.js` - 日誌系統
- `src/config/` - 配置檔案
  - `passport.js` - OAuth 配置
- `prisma/` - 資料庫設定
  - `schema.prisma` - 資料庫架構

### 📄 文件檔案

- `README.md` / `README_NEW.md` - 專案說明文檔
- `DEVELOPMENT_PROGRESS.md` - 開發進度追蹤
- `claude-platform-spec.md` - 專案技術規格
- `claude-platform-tests.md` - 測試規格
- `Context-Engineering-Intro/INITIAL.md` - 專案初始文檔

### �️ 開發與測試腳本

#### 數據管理腳本

- `add-sample-files.js` - 生成範例檔案數據
- `add-course-examples.js` - 生成課程範例
- `add-online-preview.js` - 線上預覽功能實施

#### 檢查與除錯腳本

- `check-users.js` - 檢查用戶數據
- `check-users-files.js` - 檢查用戶檔案關聯
- `check-pages.js` - 檢查頁面數據
- `check-dashboard.js` - 檢查儀表板數據
- `check-downloads.js` - 檢查下載統計

#### 修復與維護腳本

- `fix-created-files-icons.js` - 修復檔案圖標顯示
- `fix-files.js` - 檔案修復工具

#### 測試腳本

- `test-analytics.js` - 分析功能測試
- `test-data.json` / `test-data-simple.json` - 測試數據

### �🗂️ 系統目錄

- `uploads/` - 檔案上傳儲存目錄
- `logs/` - 應用程式日誌目錄
- `tests/` - 測試套件目錄
  - `unit/` - 單元測試
  - `integration/` - 整合測試
  - `e2e/` - 端對端測試
- `scripts/` - 部署與維護腳本
- `coverage/` - 測試覆蓋率報告
- `node_modules/` - NPM 依賴套件

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

## 📊 專案狀態 (2025/01/11 更新)

- ✅ 核心功能完整 (檔案管理、頁面建立、分析系統)
- ✅ GitHub 風格用戶個人檔案系統
- ✅ 線上檔案製作工具 (支援 7 種格式)
- ✅ 內容消費平台基礎架構
- ✅ 範例數據與測試用戶
- ✅ 完整的開發與除錯腳本套件
- ✅ UI/UX 設計統一化

## 🚧 進行中功能

- 📝 產品詳細頁面開發
- 🔍 線上內容瀏覽優化
- 📊 進階分析功能擴展

## 🎯 下一步計劃

### 立即任務 (本周)

1. 完成產品詳細頁面系統
2. 優化線上內容預覽體驗
3. 實施內容類型處理機制

### 短期目標 (本月)

1. 測試套件擴展與自動化
2. 效能優化與安全強化
3. 部署準備與生產環境配置

## 📈 開發工具與腳本使用指南

### 數據管理

```bash
node add-sample-files.js      # 生成範例檔案
node add-course-examples.js   # 添加課程範例
node add-online-preview.js    # 實施線上預覽
```

### 系統檢查

```bash
node check-users.js           # 檢查用戶數據
node check-users-files.js     # 檢查檔案關聯
node check-dashboard.js       # 檢查儀表板
node check-pages.js          # 檢查頁面狀態
```

### 除錯與維護

```bash
node test-analytics.js        # 測試分析功能
node fix-created-files-icons.js  # 修復圖標
```
