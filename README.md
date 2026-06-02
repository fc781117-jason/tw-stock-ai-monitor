# 台股 AI 智慧監控系統

正式 V1：React + Vite + Supabase + Vercel + OpenAI。

## 已完成模組

- Google 登入（Supabase Auth）
- 最高管理員寫死：`fc781117@gmail.com`
- 個人交易設定檔：本金、風險承受、商品偏好
- 主儀表板
- 風大 × 浪跡核心邏輯頁
- 標的工具箱：支撐、+1%、+2%、+3%、零股、現股、融資、股期、權證、選擇權
- 權證候選搜尋 Demo
- AI 盤後參考分析 API
- 每頁底部回首頁按鈕

## 環境變數

請參考 `.env.example`。

Vercel 必填：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` 或 `VITE_SUPABASE_ANON_KEY`
- `VITE_OWNER_EMAIL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## 本專案定位

本系統是交易決策輔助工具，不是自動下單系統。所有 AI 內容均為「AI 參考分析，人工確認後發布」。
