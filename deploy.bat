@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 題靈冒險 國文討伐 - 部署到雲端
echo ============================================
echo   題靈冒險（國文全班討伐）部署到 Cloudflare
echo   正式網址：https://chinese-raid.piliwu.workers.dev
echo ============================================
echo.
where node > nul 2>&1
if errorlevel 1 (
  echo [X] 找不到 Node.js。請先到 https://nodejs.org 下載安裝 LTS 版，裝好後重新雙擊本檔。
  pause
  exit /b 1
)
echo [1/5] 安裝套件（第一次約 1～2 分鐘）...
call npm ci --no-audit --no-fund
if errorlevel 1 goto fail
echo.
echo [2/5] 登入 Cloudflare：瀏覽器會跳出授權頁，請用你的 Cloudflare 帳號登入並按 Allow。
call npx wrangler login
if errorlevel 1 goto fail
echo.
echo [3/5] 建置網頁...
call npm run build
if errorlevel 1 goto fail
echo.
echo [4/5] 部署網站與即時對戰服務...
call npx wrangler deploy
if errorlevel 1 goto fail
echo.
echo [5/5] 寫入國文題庫（重複執行也不會重複新增）...
call node scripts\seed-bank.mjs
if errorlevel 1 goto fail
call npx wrangler d1 execute chinese-raid-db --remote --file work\seed-bank.sql -y
if errorlevel 1 goto fail
echo.
echo ============================================
echo   完成！請開啟 https://chinese-raid.piliwu.workers.dev
echo   用 teacher 帳號與初始密碼登入，第一次會要求改密碼。
echo ============================================
pause
exit /b 0
:fail
echo.
echo [X] 上一步失敗了。請把這個視窗的文字截圖給 Claude 看。
pause
exit /b 1
