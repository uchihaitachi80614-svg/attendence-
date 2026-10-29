@echo off
title Smart Student Attendance Tracker
echo ==============================================
echo   Smart Student Attendance Tracker
echo ==============================================
echo Starting application server...
cd /d "%~dp0"
start http://localhost:5173
npm run dev
pause
