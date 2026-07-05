# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案說明

個人記帳靜態網頁，單一檔案：`index.html`。直接用瀏覽器開啟，無需伺服器或建置步驟。

## 技術規格

- 純 HTML + CSS + JS，無框架、無建置工具
- Chart.js 4.4.0（CDN）繪製圖表
- 字體：Google Fonts（Inter + Noto Sans TC）
- 資料存在 `localStorage`（3 個 key）
- 配色：深藍紫漸層深色系（`#0a0f2e` → `#1a0a2e`）
- RWD 斷點 640px（桌機頂部 Tab、手機底部固定導航）

## 開發與驗證

```bash
# 開啟網站（Windows）
Start-Process "index.html"

# 靜態結構驗證
python C:\Users\Alex\AppData\Local\Temp\validate_accounting.py

# Playwright 瀏覽器自動化測試（需先 python -m playwright install chromium）
python C:\Users\Alex\AppData\Local\Temp\test_accounting.py
```

## localStorage 資料結構

| Key | 說明 |
|-----|------|
| `budget_accounts` | 帳戶陣列，含 `id / name / type / initialBalance / color` |
| `budget_transactions` | 交易陣列，含 `id / date / amount / flow / category / accountId / note / createdAt` |
| `budget_meta` | 目前選取月份 `currentMonth`（`YYYY-MM`）及 `version` |

帳戶餘額不冗餘存儲，每次從 transactions 動態計算：`initialBalance + Σincome − Σexpense`。

## JS 架構（`<script>` 內分層）

```
常數層   CATEGORIES / DEFAULT_ACCOUNTS / ACC_ICONS / ACC_COLORS / PIE_COLORS
Store    localStorage 讀寫封裝（getAccounts / saveTxns / getMeta …）
Logic    純函式計算（calcSummary / calcAccountBalance / filterByMonth / getLast6Months / calcCategoryStats）
格式化   formatAmt（正數，取絕對值） / formatBalance（餘額，保留負號）
UI       renderOverview / renderRecords / renderAccounts / renderStats / renderPieChart / renderBarChart
事件     bindEvents（Tab、月份、表單、刪除、匯出）
入口     initApp()
```

## UI 結構（4 個 Tab）

| Tab id | 說明 |
|--------|------|
| `#tab-overview` | 月份切換、收/支/餘數字卡、帳戶餘額 grid、最近 5 筆 |
| `#tab-records` | 新增表單（預設收合）、記錄列表（當月降序）、匯出 CSV |
| `#tab-accounts` | 帳戶卡片含即時餘額、新增帳戶 |
| `#tab-stats` | 支出分類圓餅圖（Doughnut）、近 6 個月收支長條圖（Bar） |

Tab 切換用 `section.active` class 控制顯示，`switchTab(name)` 同時更新 nav 按鈕狀態和呼叫 `renderCurrentTab()`。

## 開發慣例

- 所有樣式寫在 `<style>` 內，不拆外部 CSS
- CSS 變數定義在 `:root`，修改顏色優先改變數
- 圖表切換前必須 `chart.destroy()` 再 `new Chart()`，避免殘影
- 匯出 CSV 需加 UTF-8 BOM（`﻿`）確保 Excel 正確顯示中文
- 表單驗證以欄位下方紅字顯示錯誤（`.field-error.show`），不使用 `alert()`
- `window.deleteAccount` 是唯一暴露到全域的函式（HTML onclick 呼叫）
