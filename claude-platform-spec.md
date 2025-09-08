# Lead-Magnet Landing Page & File Delivery Platform

# 引流下載頁 + 輕量檔案投遞平台

## 1. Project Scope & Positioning

## 1. 專案範疇與定位

Lead-magnet landing page + lightweight file delivery platform for creators.

面向創作者的引流下載頁 + 輕量檔案投遞平台。

**MVP Focus:** Pages, email capture, download links, counters, and content management.

**MVP 聚焦於：** 下載頁、收信、下載連結、計數與內容管理。

---

## 2. Tech Stack

## 2. 技術棧

### Backend 後端

- **Framework:** Node.js with Express/Fastify or Python with FastAPI
- **Runtime:** Node.js 20+ or Python 3.11+
- **Package Manager:** npm/pnpm or pip/poetry

### Authentication 驗證

- **Auth System:** JWT with OAuth 2.0 (Google, GitHub)
- **驗證系統：** JWT 搭配 OAuth 2.0（Google、GitHub）

### Database 資料庫

- **DB:** PostgreSQL with Prisma ORM or SQLAlchemy
- **資料庫：** PostgreSQL 搭配 Prisma 或 SQLAlchemy

### Storage 檔案儲存

- **Development:** Local storage with multer/fastapi-files
- **Production:** S3/Cloudflare R2 with presigned URLs
- **開發環境：** 本機儲存
- **正式環境：** S3/R2 搭配預簽章網址

### Frontend 前端

- **Framework:** Next.js 14+ with App Router or Svelte/SvelteKit
- **Styling:** TailwindCSS + shadcn/ui components
- **State Management:** React Context or Zustand

---

## 3. Pages (MVP = 5 Pages)

## 3. 頁面（MVP 共 5 頁）

### Public Pages 公開頁面

1. **Landing Page** `GET /p/{slug}`
   - **前台下載頁（公開）**
   - Layout: Product content (left) + Email capture form (right)
   - Content management and A/B testing
   - 佈局：左內容右表單，搭配內容管理與 A/B 測試

### Authentication Pages 驗證頁面

2. **Login Page** `GET /login`

   - **登入頁**
   - OAuth with Google/GitHub
   - 提供 Google/GitHub OAuth 登入

3. **OAuth Callback** `GET /auth/callback`
   - **OAuth 回調頁**
   - Handles OAuth response → create/login user with JWT
   - 處理 OAuth 回傳並建立/登入使用者，發放 JWT

### Dashboard Pages 後台頁面

4. **Files Dashboard** `GET /dashboard/files`

   - **後台：檔案列表**
   - Columns: Name | Downloads | Link | Status | Edit
   - Performance insights and metrics
   - 欄位：檔名｜下載量｜連結｜狀態｜編輯

5. **File Edit Page** `GET /dashboard/files/{id}/edit`
   - **檔案編輯頁面**
   - Functions: Rename, copy link, re-upload, delete
   - Content management and optimization
   - 功能：改名、複製連結、重傳、刪除、內容管理

---

## 4. User Flows

## 4. 操作流程

### Login Flow 登入流程

1. OAuth consent → JWT token → dashboard access
2. OAuth 同意 → JWT 憑證 → 進入後台

### Upload Flow 上傳流程

1. Upload file → content management → generated landing page
2. 上傳檔案 → 內容管理 → 自動產生下載頁

### Download Flow 下載流程

1. Visitor submits email → lead collection → download delivery
2. 訪客提交信箱 → 名單收集 → 遞送下載連結

---

## 5. Data Model

## 5. 資料模型

### Users Table

```sql
users: id, name, email(unique), avatar, oauth_provider, oauth_id, role,
       created_at, updated_at
```

**users：** id、name、email(唯一)、avatar、oauth_provider、oauth_id、role、時間戳

### Files Table

```sql
files: id, user_id, name, storage_key, mime_type, size_bytes, downloads,
       download_slug, content_title, content_description, created_at, updated_at
```

**files：** id、user_id、name、storage_key、mime_type、size_bytes、downloads、download_slug、content_title、content_description、時間戳

### Pages Table

```sql
pages: id, user_id, title, slug(unique), content_json, file_id, is_active,
       conversion_rate, ab_test_variant, created_at, updated_at
```

**pages：** id、user_id、title、slug(唯一)、content_json、file_id、is_active、conversion_rate、ab_test_variant、時間戳

### Leads Table

```sql
leads: id, page_id, email, ip_address, user_agent, utm_params_json,
       engagement_data_json, created_at
```

**leads：** id、page_id、email、ip_address、user_agent、utm_params_json、engagement_data_json、created_at

### Analytics Table

```sql
analytics: id, user_id, page_id, event_type, metrics_json,
          performance_data_json, created_at
```

---

## 6. Authentication

## 6. 驗證

### JWT Authentication

- Stateless authentication with refresh tokens
- JWT 無狀態驗證搭配刷新令牌

### OAuth Integration

- Google & GitHub OAuth 2.0
- Store `oauth_provider` + `oauth_id`

---

## 7. API Routes (RESTful)

## 7. API 路由（RESTful）

### Public API 公開 API

```javascript
GET / api / p / { slug }; // Landing page data
POST / api / p / { slug } / submit; // Lead capture
GET / api / d / { download_slug }; // File download with analytics
```

### Authentication API 驗證 API

```javascript
GET / api / auth / google; // Google OAuth redirect
GET / api / auth / github; // GitHub OAuth redirect
POST / api / auth / callback; // OAuth callback handler
POST / api / auth / refresh; // JWT refresh
POST / api / auth / logout; // Logout & token invalidation
```

### Dashboard API 後台 API

```javascript
GET / api / files; // Files list with metrics
POST / api / files; // Upload file
GET / api / files / { id }; // File details
PUT / api / files / { id }; // Update file
DELETE / api / files / { id }; // Delete file
```

### Analytics API 分析 API

```javascript
GET / api / analytics; // General analytics
GET / api / analytics / { pageId }; // Page performance
GET / api / analytics / downloads; // Download statistics
```

---

## 8. Environment & Configuration

## 8. 環境與設定

### Required Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/platform

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_REDIRECT_URL=http://localhost:3000/api/auth/callback

# Storage
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

---

## 9. Core Features

## 9. 核心功能

### Content Management

- Rich text editor for landing page content
- File upload and organization
- Template system for quick page creation
- 豐富的文字編輯器、檔案上傳整理、快速頁面建立模板

### Analytics & Tracking

- Download tracking and statistics
- Lead conversion metrics
- A/B testing framework
- 下載追蹤統計、轉換率指標、A/B 測試框架

### User Experience

- Responsive design for all devices
- Fast loading times and optimization
- Clean and intuitive dashboard
- 響應式設計、快速載入、簡潔直覺的後台

### Lead Management

- Email collection and validation
- Lead export capabilities
- Basic segmentation features
- 信箱收集驗證、名單匯出、基本分群功能

---

## 10. Security & Performance

## 10. 安全與效能

### API Security

- Rate limiting with Redis
- JWT token validation with blacklisting
- CORS configuration
- Input validation and sanitization

### File Security

- Virus scanning for uploads
- Presigned URLs for secure downloads
- Content-Type validation
- File size limits

### Performance Optimization

- CDN integration (Cloudflare)
- Database query optimization with indexes
- Caching strategy (Redis)
- Image optimization and compression

---

## 11. Testing Strategy

## 11. 測試策略

### Unit Tests

- Authentication logic
- File upload/download functions
- AI integration modules
- Database models and queries

### Integration Tests

- OAuth flow end-to-end
- File storage operations
- AI API interactions
- Email delivery system

### E2E Tests

- Complete user journeys
- Landing page functionality
- Dashboard operations
- Download flow validation

### Performance Testing

- Load testing for high traffic
- Database query optimization
- File delivery performance
- Response time monitoring

---

## Development Roadmap

## 開發路線圖

### Phase 1: Core Platform (Weeks 1-2)

- [ ] Project setup and configuration
- [ ] Database design and migrations
- [ ] Authentication system (OAuth + JWT)
- [ ] Basic file upload/download

### Phase 2: Core Features (Weeks 3-4)

- [ ] Content management system
- [ ] Landing page builder
- [ ] Analytics dashboard
- [ ] A/B testing framework

### Phase 3: Dashboard & UX (Weeks 5-6)

- [ ] Dashboard interface design
- [ ] Landing page builder
- [ ] Analytics and insights
- [ ] Responsive design

### Phase 4: Advanced Features (Weeks 7-8)

- [ ] A/B testing framework
- [ ] Email automation
- [ ] Advanced analytics
- [ ] Performance optimization

### Phase 5: Testing & Deployment (Weeks 9-10)

- [ ] Comprehensive testing suite
- [ ] Production deployment
- [ ] Monitoring and alerting
- [ ] Documentation and training

---

## Project Status

**Status:** Specification Updated for Lead-Magnet Platform ✅  
**Tech Stack:** Modern Node.js + Content Management  
**Next Step:** Environment setup and basic file handling  
**目前狀態：** 引流平台規格更新完成 ✅  
**技術棧：** 現代 Node.js + 內容管理  
**下一步：** 環境設定與基本檔案處理
