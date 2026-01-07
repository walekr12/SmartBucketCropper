"""
图像处理服务
使用 Pillow 进行裁剪、缩放和导出
"""
import os
import shutil
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image


def snap_to_64(value: int) -> int:
    """四舍五入到最近的 64 倍数"""
    return int(round(value / 64) * 64)


def crop_and_resize_image(
    image_path: str,
    crop_params: Dict[str, Any],
    target_width: int,
    target_height: int,
    output_path: str
) -> bool:
    """
    裁剪并缩放图片
    
    Args:
        image_path: 原图路径
        crop_params: 裁剪参数 {'x': int, 'y': int, 'width': int, 'height': int}
        target_width: 目标宽度 (必须是64的倍数)
        target_height: 目标高度 (必须是64的倍数)
        output_path: 输出路径
    
    Returns:
        bool: 是否成功
    """
    try:
        with Image.open(image_path) as img:
            # 转换为 RGB (处理 RGBA 或其他模式)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # 裁剪区域
            x = crop_params['x']
            y = crop_params['y']
            width = crop_params['width']
            height = crop_params['height']
            
            # 执行裁剪
            cropped = img.crop((x, y, x + width, y + height))
            
            # 使用 LANCZOS 缩放到目标尺寸
            resized = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            # 最终检查：确保输出尺寸是 64 的倍数
            final_width, final_height = resized.size
            assert final_width % 64 == 0, f"输出宽度 {final_width} 不是 64 的倍数"
            assert final_height % 64 == 0, f"输出高度 {final_height} 不是 64 的倍数"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # 保存图片
            resized.save(output_path, quality=95)
            
            return True
            
    except Exception as e:
        print(f"处理图片失败 {image_path}: {e}")
        return False


def find_companion_files(image_path: str) -> List[str]:
    """
    查找与图片同名的伴随文件 (.txt, .json, .caption 等)
    """
    companion_extensions = ['.txt', '.json', '.caption', '.tags']
    companions = []
    
    base_path = os.path.splitext(image_path)[0]
    
    for ext in companion_extensions:
        companion_path = base_path + ext
        if os.path.exists(companion_path):
            companions.append(companion_path)
    
    return companions


def copy_companion_files(image_path: str, output_dir: str) -> List[str]:
    """
    复制伴随文件到输出目录
    """
    companions = find_companion_files(image_path)
    copied = []
    
    for companion in companions:
        filename = os.path.basename(companion)
        output_path = os.path.join(output_dir, filename)
        
        try:
            shutil.copy2(companion, output_path)
            copied.append(output_path)
        except Exception as e:
            print(f"复制伴随文件失败 {companion}: {e}")
    
    return copied


def process_batch_export(
    images: List[Dict[str, Any]],
    buckets: Dict[str, Dict[str, int]],
    output_dir: str,
    copy_companions: bool = True
) -> Dict[str, Any]:
    """
    批量处理导出
    
    Args:
        images: 图片列表，包含裁剪参数
        buckets: 桶配置 {'A': {'width': 1024, 'height': 1024}, ...}
        output_dir: 输出目录
        copy_companions: 是否复制伴随文件
    
    Returns:
        处理结果统计
    """
    results = {
        'total': len(images),
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
    }
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    for img in images:
        # 跳过未裁剪的图片
        if not img.get('cropped') or not img.get('crop_params'):
            results['skipped'] += 1
            continue
        
        bucket_id = img.get('assigned_bucket', 'A')
        bucket = buckets.get(bucket_id, {'width': 1024, 'height': 1024})
        
        # 生成输出文件名 - 保持原文件名，以便与txt对应
        filename = img['filename']
        output_path = os.path.join(output_dir, filename)
        
        # 执行裁剪和缩放
        success = crop_and_resize_image(
            image_path=img['path'],
            crop_params=img['crop_params'],
            target_width=bucket['width'],
            target_height=bucket['height'],
            output_path=output_path
        )
        
        if success:
            results['success'] += 1
            
            # 复制伴随文件
            if copy_companions:
                copy_companion_files(img['path'], output_dir)
        else:
            results['failed'] += 1
            results['errors'].append(f"处理失败: {filename}")
    
    return results


def get_image_thumbnail(image_path: str, max_size: int = 200) -> Optional[bytes]:
    """
    生成图片缩略图的 base64 数据
    """
    try:
        with Image.open(image_path) as img:
            # 保持比例缩放
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # 转换为 RGB
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # 转为 bytes
            import io
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            return buffer.getvalue()
            
    except Exception as e:
        print(f"生成缩略图失败 {image_path}: {e}")
        return None


def calculate_default_crop(
    image_width: int,
    image_height: int,
    target_ratio: float
) -> Dict[str, int]:
    """
    计算默认的裁剪区域 (居中裁剪，保持目标比例)
    
    Args:
        image_width: 原图宽度
        image_height: 原图高度
        target_ratio: 目标宽高比 (width / height)
    
    Returns:
        {'x': int, 'y': int, 'width': int, 'height': int}
    """
    current_ratio = image_width / image_height
    
    if current_ratio > target_ratio:
        # 图片太宽，需要左右裁剪
        crop_height = image_height
        crop_width = int(image_height * target_ratio)
        x = (image_width - crop_width) // 2
        y = 0
    else:
        # 图片太高，需要上下裁剪
        crop_width = image_width
        crop_height = int(image_width / target_ratio)
        x = 0
        y = (image_height - crop_height) // 2
    
    return {
        'x': x,
        'y': y,
        'width': crop_width,
        'height': crop_height
    }
