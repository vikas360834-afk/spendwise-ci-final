@echo off
title SpendWise AI
cd /d "%~dp0"
echo Starting SpendWise AI...
echo.
call npm run dev
echo.
echo SpendWise stopped.
pause
