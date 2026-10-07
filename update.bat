@echo off
chcp 65001 >nul
title BinBox Studio - Update & GitHub Sync
echo ========================================================
echo    BINBOX STUDIO - 1-CLICK UPDATE & GITHUB SYNC
echo ========================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-and-push.ps1"
echo.
echo Nhấn phím bất kỳ để đóng cửa sổ này...
pause >nul
