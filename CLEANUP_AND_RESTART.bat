@echo off
REM Cleanup script for OE Toolkit development environment

echo.
echo 🧹 Cleaning up OE Toolkit...
echo.

cd /d "%~dp0tools\oe-toolkit"

REM Remove all caches and node_modules
echo Removing node_modules...
if exist node_modules rmdir /s /q node_modules
if exist pnpm-lock.yaml del pnpm-lock.yaml
if exist .vite rmdir /s /q .vite
if exist dist rmdir /s /q dist
if exist client\dist rmdir /s /q client\dist

echo.
echo ✅ Cleanup complete
echo.
echo 📦 Reinstalling dependencies...
echo.

call pnpm install

echo.
echo ✅ Dependencies installed
echo.
echo 🚀 Ready to start dev server with: npm run dev
echo.
pause
