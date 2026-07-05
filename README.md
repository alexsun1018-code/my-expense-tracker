# 我的記帳本

個人記帳靜態網頁，單一檔案 `index.html`，直接用瀏覽器開啟即可使用，無需伺服器或建置步驟。

## 功能

- **總覽**：切換月份，顯示收入 / 支出 / 結餘，各帳戶餘額與最近 5 筆記錄
- **記錄**：新增收支紀錄、當月記錄列表、匯出 CSV
- **帳戶**：管理多個帳戶，即時計算餘額
- **統計**：支出分類圓餅圖、近 6 個月收支長條圖

## 技術

- 純 HTML + CSS + JavaScript，無框架、無建置工具
- [Chart.js](https://www.chartjs.org/) 4.4.0（CDN）繪製圖表
- Google Fonts（Inter + Noto Sans TC）
- 資料儲存在瀏覽器 `localStorage`，不需後端

## 使用方式

直接用瀏覽器開啟 `index.html` 即可。

```bash
# Windows
Start-Process "index.html"
```
