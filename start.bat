@echo off
title QuizMaster - He Thong Thi Trac Nghiem
echo ===================================================
echo   Dang khoi dong he thong QuizMaster...
echo ===================================================
cd /d "%~dp0"

start http://localhost:3001
node server.js
pause

