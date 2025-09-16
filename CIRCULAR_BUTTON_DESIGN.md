# 圓形按鈕 Flex 布局設計方案

## 設計概念

將下載頁面的功能按鈕（線上閱讀、收藏、分享）重新設計為水平排列的圓形按鈕，採用現代化的視覺風格，提升用戶體驗。

## 視覺設計參考

基於用戶提供的參考設計，將採用以下布局：

```
┌─────────────────────────────────┐
│      功能操作區                  │
├─────────────────────────────────┤
│   ⭕      ⭕      ⭕           │
│  線上閱讀  收藏   分享連結       │
└─────────────────────────────────┘
```

## 詳細實作方案

### HTML 結構

```html
<!-- 圓形按鈕功能區域 -->
<div class="action-buttons-circle">
  <div class="circle-btn-group">
    <!-- 線上閱讀按鈕 -->
    <div class="circle-btn-item">
      <button
        class="circle-btn btn-read"
        onclick="previewContent()"
        id="previewBtn"
      >
        <div class="btn-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      </button>
      <span class="btn-label">線上閱讀</span>
    </div>

    <!-- 收藏按鈕 -->
    <div class="circle-btn-item">
      <button
        class="circle-btn btn-favorite"
        onclick="toggleFavorite()"
        id="favoriteBtn"
      >
        <div class="btn-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </div>
      </button>
      <span class="btn-label">收藏</span>
    </div>

    <!-- 分享按鈕 -->
    <div class="circle-btn-item">
      <button
        class="circle-btn btn-share"
        onclick="shareContent()"
        id="shareBtn"
      >
        <div class="btn-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.83 3.98" />
            <path d="m15.41 6.51-6.82 3.98" />
          </svg>
        </div>
      </button>
      <span class="btn-label">分享連結</span>
    </div>
  </div>
</div>
```

### CSS 樣式設計

```css
/* 圓形按鈕容器 */
.action-buttons-circle {
  margin-top: 24px;
  padding: 20px 0;
}

/* 按鈕組容器 - 水平flex布局 */
.circle-btn-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  padding: 16px;
}

/* 單個按鈕項目容器 */
.circle-btn-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* 圓形按鈕基礎樣式 */
.circle-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* 按鈕圖標容器 */
.circle-btn .btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: transform 0.3s ease;
}

/* 按鈕標籤 */
.btn-label {
  font-size: 13px;
  color: #4b5563;
  font-weight: 500;
  text-align: center;
  transition: color 0.3s ease;
}

/* 各按鈕的獨特顏色 */

/* 線上閱讀按鈕 */
.btn-read {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-read:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.btn-read:active {
  transform: translateY(-1px);
}

/* 收藏按鈕 */
.btn-favorite {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-favorite:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
}

.btn-favorite.favorited {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.btn-favorite.favorited:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

/* 分享按鈕 */
.btn-share {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.btn-share:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

/* 按鈕懸停時的圖標動畫 */
.circle-btn:hover .btn-icon {
  transform: scale(1.1);
}

/* 按鈕點擊波紋效果 */
.circle-btn::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.circle-btn:active::before {
  width: 120px;
  height: 120px;
}

/* 懸停時標籤顏色變化 */
.circle-btn-item:hover .btn-label {
  color: #1f2937;
  font-weight: 600;
}

/* 響應式設計 */

/* 平板設備 */
@media (max-width: 768px) {
  .circle-btn-group {
    gap: 24px;
    padding: 12px;
  }

  .circle-btn {
    width: 56px;
    height: 56px;
  }

  .btn-label {
    font-size: 12px;
  }

  .circle-btn .btn-icon svg {
    width: 20px;
    height: 20px;
  }
}

/* 手機設備 */
@media (max-width: 480px) {
  .circle-btn-group {
    gap: 20px;
    padding: 8px;
  }

  .circle-btn {
    width: 52px;
    height: 52px;
  }

  .btn-label {
    font-size: 11px;
  }

  .circle-btn .btn-icon svg {
    width: 18px;
    height: 18px;
  }
}

/* 超小螢幕 */
@media (max-width: 320px) {
  .circle-btn-group {
    gap: 16px;
  }

  .circle-btn {
    width: 48px;
    height: 48px;
  }

  .btn-label {
    font-size: 10px;
  }
}

/* 載入狀態 */
.circle-btn.loading {
  pointer-events: none;
  opacity: 0.7;
}

.circle-btn.loading .btn-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 禁用狀態 */
.circle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  background: #e5e7eb !important;
}

/* 焦點狀態（無障礙性） */
.circle-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 15px rgba(0, 0, 0, 0.1);
}

.circle-btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

## 實作步驟

### 步驟 1：更新 public.js 中的按鈕區域

在 `src/routes/public.js` 文件的第 1158-1183 行，將原有的垂直按鈕布局替換為新的圓形按鈕布局。

### 步驟 2：添加互動增強

```javascript
// 初始化圓形按鈕動畫
function initCircleButtons() {
  const buttons = document.querySelectorAll(".circle-btn");

  buttons.forEach((btn) => {
    // 添加點擊波紋效果
    btn.addEventListener("click", function (e) {
      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";

      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";

      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  // 添加鍵盤支援
  buttons.forEach((btn, index) => {
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("role", "button");

    btn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
  });
}

// 頁面載入時初始化
document.addEventListener("DOMContentLoaded", initCircleButtons);
```

## 預期效果

1. **視覺吸引力提升**

   - 圓形按鈕更加現代化和友好
   - 漸變色背景增加視覺層次
   - 懸停動畫提升互動感

2. **用戶體驗優化**

   - 水平排列節省垂直空間
   - 圖標和標籤組合更直觀
   - 響應式設計適配各種設備

3. **互動性增強**
   - 懸停時的上浮效果
   - 點擊波紋反饋
   - 載入狀態提示

## 整合考量

### 與現有功能的協調

- 保留原有的點擊事件處理
- 維持登入狀態檢測邏輯
- 確保無障礙性支援

### 與會員功能的結合

對於已登入用戶，可以在按鈕上添加特殊標記：

```css
/* 會員專屬標記 */
.circle-btn-item.member-only .circle-btn::after {
  content: "✓";
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  border: 2px solid white;
}
```

## 測試要點

1. **跨瀏覽器兼容性**

   - Chrome、Firefox、Safari、Edge
   - 移動瀏覽器測試

2. **響應式表現**

   - 320px - 480px（手機）
   - 481px - 768px（平板）
   - 769px+（桌面）

3. **互動測試**

   - 點擊響應速度
   - 動畫流暢度
   - 鍵盤導航功能

4. **無障礙性**
   - 螢幕閱讀器支援
   - 鍵盤操作
   - 焦點管理

## 效能優化

1. **CSS 優化**

   - 使用 `will-change` 屬性優化動畫
   - 避免重排和重繪
   - 使用 CSS 變數管理顏色

2. **JavaScript 優化**
   - 使用事件委託
   - 防抖和節流處理
   - 延遲載入非關鍵功能

## 結論

圓形按鈕的 flex 布局設計將為下載頁面帶來更現代化的視覺體驗，同時保持功能的易用性和可訪問性。這種設計不僅美觀，還能有效引導用戶操作，提升整體的用戶體驗。
