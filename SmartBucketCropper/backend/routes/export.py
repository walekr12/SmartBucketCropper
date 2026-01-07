"""
导出处理 API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.image_processor import process_batch_export

router = APIRouter(prefix="/api/export", tags=["Export"])


class CropParams(BaseModel):
    x: int
    y: int
    width: int
    height: int


class ImageExportData(BaseModel):
    path: str
    filename: str
    assigned_bucket: str
    cropped: bool
    crop_params: Optional[CropParams] = None


class BucketConfig(BaseModel):
    width: int
    height: int


class ExportRequest(BaseModel):
    images: List[ImageExportData]
    buckets: Dict[str, BucketConfig]
    output_dir: str
    copy_companions: bool = True


class ExportResponse(BaseModel):
    total: int
    success: int
    failed: int
    skipped: int
    errors: List[str]
    output_dir: str


@router.post("/batch", response_model=ExportResponse)
async def batch_export(request: ExportRequest):
    """
    批量导出裁剪后的图片
    """
    try:
        # 转换数据格式
        images = []
        for img in request.images:
            img_dict = {
                'path': img.path,
                'filename': img.filename,
                'assigned_bucket': img.assigned_bucket,
                'cropped': img.cropped,
                'crop_params': img.crop_params.model_dump() if img.crop_params else None
            }
            images.append(img_dict)
        
        buckets = {
            bucket_id: {'width': config.width, 'height': config.height}
            for bucket_id, config in request.buckets.items()
        }
        
        # 执行批量导出
        results = process_batch_export(
            images=images,
            buckets=buckets,
            output_dir=request.output_dir,
            copy_companions=request.copy_companions
        )
        
        return ExportResponse(
            total=results['total'],
            success=results['success'],
            failed=results['failed'],
            skipped=results['skipped'],
            errors=results['errors'],
            output_dir=request.output_dir
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/preview")
async def preview_crop(image_path: str, crop_params: CropParams, bucket_width: int, bucket_height: int):
    """
    预览裁剪效果 (返回 base64 预览图)
    """
    try:
        from PIL import Image
        import io
        import base64
        
        with Image.open(image_path) as img:
            # 裁剪
            cropped = img.crop((
                crop_params.x,
                crop_params.y,
                crop_params.x + crop_params.width,
                crop_params.y + crop_params.height
            ))
            
            # 缩放到目标尺寸的缩略图 (用于预览)
            preview_size = (min(bucket_width, 400), min(bucket_height, 400))
            cropped.thumbnail(preview_size, Image.Resampling.LANCZOS)
            
            # 转换为 RGB
            if cropped.mode in ('RGBA', 'P'):
                cropped = cropped.convert('RGB')
            
            # 转为 base64
            buffer = io.BytesIO()
            cropped.save(buffer, format='JPEG', quality=85)
            preview_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return {
                "preview": preview_base64,
                "target_width": bucket_width,
                "target_height": bucket_height
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预览失败: {str(e)}")
