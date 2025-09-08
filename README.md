# Lead-Magnet Platform 📊

現代化的潛在客戶收集平台，讓您輕鬆建立高轉換率的下載頁面並管理文件分享。

## 🌟 專案特色

### 🚀 核心功能
- **📁 智能檔案管理** - 安全的檔案上傳、下載與管理系統
- **🎨 下載頁面建立器** - 拖拉即用的響應式頁面建立工具  
- **📈 即時分析儀表板** - 完整的下載追蹤與轉換分析
- **👥 潛在客戶管理** - 自動收集客戶信息與名單匯出
- **🛠 檔案製作工具** - 支援 7 種格式的線上檔案製作

### 💡 進階特色
- **🔗 安全分享** - 唯一下載連結與 IP 追蹤
- **📊 詳細統計** - 下載次數、頁面瀏覽、轉換率分析
- **🎯 使用者體驗** - 現代化界面設計，無外部依賴
- **⚡ 高效能** - 本地化資源與快速載入

## 🛠 技術架構

### 後端技術
- **Node.js + Express.js** - 高效能伺服器架構
- **SQLite + Prisma ORM** - 輕量化資料庫解決方案
- **JWT 多重認證** - 安全的身份驗證系統
- **Winston 日誌** - 完整的系統記錄

### 前端技術
- **純 HTML/CSS/JS** - 無框架依賴，快速載入
- **本地 CSS 工具** - 無外部 CDN，完全自主控制
- **響應式設計** - 支援所有裝置尺寸
- **現代化 UI** - 橘黃色漸層主題設計

### 檔案支援
- **上傳格式** - 支援常見檔案格式 (PDF, DOC, PPT, 圖片等)
- **製作格式** - TXT, JSON, CSV, HTML, XML, Markdown, PDF

## 📋 系統需求

- **Node.js** 18+ 
- **npm** 或 **yarn**
- **SQLite** (內建，無需額外安裝)

## 🚀 快速開始

### 1. 下載與安裝

```bash
git clone https://github.com/Jeffrey0117/batchdall.git
cd upper
npm install
```

### 2. 環境設定

複製環境變數範例並進行設定：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：

```env
# 基本設定
NODE_ENV=development
PORT=3000
JWT_SECRET=your_strong_secret_key

# 開發用設定 (可選)
DEV_LOGIN_ENABLED=true
```

### 3. 資料庫初始化

```bash
# 產生 Prisma 客戶端
npx prisma generate

# 推送資料庫架構
npx prisma db push
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

平台將運行在 `http://localhost:3000`

### 5. 開始使用

1. 訪問 `http://localhost:3000` 查看主頁
2. 前往 `http://localhost:3000/admin.html` 進入管理面板
3. 使用開發者登入快速進入系統

## 📁 專案結構

```
upper/
├── src/                    # 後端源碼
│   ├── app.js             # 主應用程式
│   ├── routes/            # API 路由
│   │   ├── analytics.js   # 分析統計 API
│   │   ├── auth.js        # 認證系統
│   │   ├── fileCreator.js # 檔案製作 API
│   │   ├── files.js       # 檔案管理 API
│   │   ├── images.js      # 圖片管理 API
│   │   ├── pages.js       # 頁面管理 API
│   │   └── public.js      # 公開路由
│   ├── middleware/        # 中介軟體
│   │   ├── auth.js        # 認證中介軟體
│   │   └── errorHandler.js # 錯誤處理
│   ├── config/            # 配置檔案
│   └── utils/             # 工具函數
├── public/                # 前端檔案
│   ├── index.html         # 主頁
│   ├── admin.html         # 管理面板
│   ├── file-creator.html  # 檔案製作工具
│   ├── login.html         # 登入頁面
│   └── css/               # 樣式檔案
├── prisma/                # 資料庫架構
├── uploads/               # 檔案儲存
└── logs/                  # 系統日誌
```

## 🔗 API 端點

### 認證系統
- `POST /api/auth/dev-login` - 開發者快速登入
- `POST /api/auth/login` - 一般登入
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 取得當前用戶

### 檔案管理 (需認證)
- `GET /api/files` - 取得檔案列表
- `POST /api/files` - 上傳檔案
- `PUT /api/files/:id` - 更新檔案
- `DELETE /api/files/:id` - 刪除檔案

### 頁面管理 (需認證)
- `GET /api/pages` - 取得頁面列表
- `POST /api/pages` - 建立頁面
- `PUT /api/pages/:id` - 更新頁面
- `DELETE /api/pages/:id` - 刪除頁面

### 檔案製作 (需認證)
- `POST /api/file-creator` - 製作檔案 (支援 7 種格式)

### 分析統計 (需認證)
- `GET /api/analytics` - 取得總覽統計
- `GET /api/analytics/leads` - 取得潛在客戶列表
- `GET /api/analytics/downloads` - 取得下載統計

### 圖片管理 (需認證)
- `POST /api/upload-images` - 上傳圖片

### 公開路由
- `GET /download-page/:slug` - 下載頁面
- `GET /download/:downloadSlug` - 檔案下載
- `POST /submit-form` - 提交客戶信息

## 🎯 主要功能

### 1. 檔案管理系統
- ✅ 檔案上傳與儲存
- ✅ 檔案重命名與刪除
- ✅ 網格/列表視圖
- ✅ 檔案大小與類型驗證

### 2. 下載頁面建立器
- ✅ 拖拉式頁面編輯
- ✅ 響應式模板
- ✅ 圖片管理功能
- ✅ 安全連結生成

### 3. 檔案製作工具
- ✅ 支援 7 種檔案格式
- ✅ 即時預覽功能
- ✅ 模板系統
- ✅ 自動頁面生成

### 4. 分析儀表板
- ✅ 即時統計數據
- ✅ 下載追蹤
- ✅ 轉換率分析
- ✅ IP 重複檢測

### 5. 潛在客戶管理
- ✅ 自動信息收集
- ✅ 客戶列表管理
- ✅ CSV 匯出功能
- ✅ 來源追蹤

## 📊 系統統計

### 完成的功能
- **23 個 API 端點** - 完整的後端功能
- **5 個前端頁面** - 現代化使用者界面
- **7 種檔案格式** - 檔案製作支援
- **完整認證系統** - 安全的存取控制

### 支援的檔案格式
**上傳：** PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, GIF, MP4, ZIP...
**製作：** TXT, JSON, CSV, HTML, XML, Markdown, PDF

## 🔧 開發指令

```bash
# 開發模式
npm run dev

# 生產模式
npm start

# 資料庫管理
npx prisma studio          # 打開資料庫管理界面
npx prisma db push         # 推送架構變更
npx prisma generate        # 產生客戶端

# 清理與重置
npm run clean              # 清理暫存檔案
```

## 🛡 安全特性

- **JWT 認證** - 安全的身份驗證
- **檔案驗證** - 上傳檔案安全檢查
- **IP 追蹤** - 防止重複下載
- **安全連結** - 唯一下載 URL
- **輸入驗證** - 防止惡意輸入
- **錯誤處理** - 完善的錯誤管理

## 📈 部署建議

### 環境變數 (生產環境)
```env
NODE_ENV=production
JWT_SECRET=strong_production_secret
PORT=3000
```

### Docker 部署 (可選)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 貢獻指南

1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 建立 Pull Request

## 📝 版本資訊

- **當前版本:** v1.0.0
- **最後更新:** 2025/09/09
- **開發狀態:** 準備部署

## 📞 支援與聯繫

- **GitHub Issues:** [回報問題](https://github.com/Jeffrey0117/batchdall/issues)
- **文件:** 查看專案內的 `DEVELOPMENT_PROGRESS.md`
- **示範影片:** 即將推出

## 📚 相關資源

- [Prisma 文件](https://www.prisma.io/docs/)
- [Express.js 指南](https://expressjs.com/)
- [Node.js 最佳實踐](https://github.com/goldbergyoni/nodebestpractices)

---

**🚀 為創作者和行銷人員而生**

*這個專案展示了如何建立一個完整的潛在客戶收集平台，從檔案管理到客戶分析，一應俱全。*
