@echo off
chcp 65001 > nul
echo ========================================
echo   SmartBucketCropper - Starting...
echo ========================================
echo.

REM Go to backend directory and start
cd /d "e:\xunlei\picture-edit\SmartBucketCropper\backend"
start "Backend" cmd /k "cd /d e:\xunlei\picture-edit\SmartBucketCropper\backend && python main.py"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start Frontend
start "Frontend" cmd /k "cd /d e:\xunlei\picture-edit\SmartBucketCropper\frontend && npm run dev"

echo.
echo ========================================
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo ========================================
echo   服务已启动！
echo   后端: http://localhost:8000
echo   前端: http://localhost:5173
echo   API文档: http://localhost:8000/docs
echo ========================================
echo.
echo 按任意键打开浏览器...
pause >nul

start http://localhost:5173
·
