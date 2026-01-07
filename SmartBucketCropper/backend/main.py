"""
SmartBucketCropper Backend
FastAPI 主入口
"""
import os
import sys

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routes.scan import router as scan_router
from routes.export import router as export_router

# 创建 FastAPI 应用
app = FastAPI(
    title="SmartBucketCropper API",
    description="智能图片分桶裁剪工具 - 为深度学习训练数据集优化",
    version="1.0.0"
)

# 配置 CORS (允许前端访问)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(scan_router)
app.include_router(export_router)


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "message": "SmartBucketCropper API is running"}


@app.get("/api/image/{image_path:path}")
async def serve_image(image_path: str):
    """
    提供图片文件访问 (用于前端显示)
    """
    # 安全检查：确保路径存在
    if os.path.exists(image_path) and os.path.isfile(image_path):
        return FileResponse(image_path)
    return {"error": "Image not found"}


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  SmartBucketCropper Backend Starting...")
    print("  API Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
