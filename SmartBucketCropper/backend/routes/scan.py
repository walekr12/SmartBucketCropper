"""
扫描文件夹 API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import base64
import traceback

from services.bucket_analyzer import (
    scan_folder_for_images,
    analyze_buckets,
    assign_images_to_buckets,
    validate_bucket_size
)
from services.image_processor import get_image_thumbnail, calculate_default_crop

router = APIRouter(prefix="/api/scan", tags=["Scan"])


class ScanRequest(BaseModel):
    folder_path: str


class ValidateBucketRequest(BaseModel):
    width: int
    height: int


class ScanResponse(BaseModel):
    images: List[Dict[str, Any]]
    buckets: List[Dict[str, Any]]
    total_count: int


class ValidateBucketResponse(BaseModel):
    width: int
    height: int
    was_modified: bool
    message: Optional[str] = None


@router.post("/folder", response_model=ScanResponse)
async def scan_folder(request: ScanRequest):
    """
    扫描文件夹，分析图片并生成推荐桶配置
    """
    try:
        print(f"[扫描] 开始扫描文件夹: {request.folder_path}")
        
        # 扫描文件夹中的图片
        images = scan_folder_for_images(request.folder_path)
        print(f"[扫描] 找到 {len(images)} 张图片")
        
        if not images:
            raise HTTPException(status_code=404, detail="文件夹中没有找到支持的图片格式")
        
        # 分析并生成桶配置
        print(f"[分析] 开始 K-Means 分桶分析...")
        buckets = analyze_buckets(images, n_buckets=3)
        print(f"[分析] 生成了 {len(buckets)} 个桶: {buckets}")
        
        if not buckets:
            # 创建默认桶
            buckets = [
                {'id': 'A', 'width': 1024, 'height': 1024, 'aspect_ratio': 1.0, 'image_count': 0}
            ]
            print(f"[分析] 使用默认桶配置")
        
        # 将图片分配到桶
        print(f"[分配] 开始分配图片到桶...")
        images = assign_images_to_buckets(images, buckets)
        
        # 为每张图片计算默认裁剪区域
        print(f"[裁剪] 计算默认裁剪区域...")
        for img in images:
            bucket = next((b for b in buckets if b['id'] == img['assigned_bucket']), buckets[0])
            target_ratio = bucket['width'] / bucket['height']
            img['default_crop'] = calculate_default_crop(
                img['width'],
                img['height'],
                target_ratio
            )
        
        print(f"[完成] 扫描完成，返回 {len(images)} 张图片，{len(buckets)} 个桶")
        
        return ScanResponse(
            images=images,
            buckets=buckets,
            total_count=len(images)
        )
        
    except ValueError as e:
        print(f"[错误] ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[错误] Exception: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"扫描失败: {str(e)}")


@router.post("/validate-bucket", response_model=ValidateBucketResponse)
async def validate_bucket(request: ValidateBucketRequest):
    """
    验证并修正桶尺寸到 64 倍数
    """
    new_width, new_height, was_modified = validate_bucket_size(
        request.width,
        request.height
    )
    
    message = None
    if was_modified:
        message = "已自动对齐到 64 倍数以优化显存效率"
    
    return ValidateBucketResponse(
        width=new_width,
        height=new_height,
        was_modified=was_modified,
        message=message
    )


@router.get("/thumbnail/{image_path:path}")
async def get_thumbnail(image_path: str):
    """
    获取图片缩略图
    """
    try:
        thumbnail_bytes = get_image_thumbnail(image_path)
        if thumbnail_bytes:
            return {
                "thumbnail": base64.b64encode(thumbnail_bytes).decode('utf-8')
            }
        else:
            raise HTTPException(status_code=404, detail="无法生成缩略图")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
