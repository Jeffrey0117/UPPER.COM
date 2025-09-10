# 商品輪播區塊前端規格

## 整體結構

- 區塊為水平輪播，一次顯示 6 張卡片
- 外容器留有左右間距，上下留白
- 左右切換按鈕為圓形透明按鈕，垂直置中
- 右上角有分頁圓點指示器

## 滑軌與可視區

- `.viewport`：`overflow:hidden;` 固定高度
- `.track`：`display:flex; gap:24px;`
- 卡片寬度：`flex:0 0 calc((100% - 5*24px)/6)`
- 滑動效果：`transform:translateX(); transition:.4s;`

## 卡片結構

- 外層：直式 flex
- 圖片區：白底，高度固定 160–180px，`object-fit:contain`
- 標題：2–3 行，字體 13–14px，省略號裁切
- 價格列：灰色「優惠價」+ 紅色粗體售價，同行顯示

## 間距

- 卡片內部元素上下間距 8–10px
- 外部間距由 `gap` 控制

## 導覽箭頭

- 絕對定位：垂直置中，偏移容器外側
- 尺寸：36–40px 圓形
- 狀態：hover 陰影加強；disabled 降低透明度

## 分頁圓點

- 右上角水平排列
- 當前頁為實心，其他描邊
- 可點擊切換

## 響應式

- ≥1280px：6 張
- 1024–1279px：5 張
- 768–1023px：4 張
- 480–767px：2–3 張
- <480px：1–2 張

## 無障礙

- 箭頭：`aria-label="上一頁/下一頁"`
- 圓點：`role="tablist"`、作用中加 `aria-selected`
- 可點擊範圍 ≥40px

## 建議 HTML 結構

```html
<div class="carousel">
  <div class="viewport">
    <div class="track">
      <div class="card">
        <div class="thumb"><img src="" alt="" /></div>
        <div class="title">書名文字</div>
        <div class="price-row">
          <span class="label">優惠價：</span>
          <span class="sale">NT$299</span>
        </div>
      </div>
      <!-- 其他卡片 -->
    </div>
  </div>
  <button class="arrow prev"></button>
  <button class="arrow next"></button>
  <div class="dots">
    <button></button>
    <!-- 其他圓點 -->
  </div>
</div>
```
