"""
智能分桶分析服务
按长宽比分类：横向(宽>高)、正方形(宽≈高)、纵向(高>宽)
"""
import os
from typing import List, Tuple, Dict, Any
from PIL import Image
import numpy as np

# 支持的图片格式
SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.gif'}

# 长宽比阈值
LANDSCAPE_THRESHOLD = 1.1   # 宽/高 > 1.1 为横向
PORTRAIT_THRESHOLD = 0.9    # 宽/高 < 0.9 为纵向
# 0.9 <= 宽/高 <= 1.1 为正方形


def snap_to_64(value: float) -> int:
    """
    四舍五入到最近的 64 倍数
    例如: 1000 -> 1024, 500 -> 512, 750 -> 768
    """
    return int(round(value / 64) * 64)


def get_image_dimensions(image_path: str) -> Tuple[int, int]:
    """获取图片的宽高"""
    with Image.open(image_path) as img:
        return img.size  # (width, height)


def scan_folder_for_images(folder_path: str) -> List[Dict[str, Any]]:
    """
    扫描文件夹中的所有图片
    返回每张图片的路径和尺寸信息
    """
    images = []
    
    if not os.path.exists(folder_path):
        raise ValueError(f"文件夹不存在: {folder_path}")
    
    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in SUPPORTED_FORMATS:
                filepath = os.path.join(root, filename)
                try:
                    width, height = get_image_dimensions(filepath)
                    aspect_ratio = width / height if height > 0 else 1.0
                    
                    # 分类：横向/正方形/纵向
                    if aspect_ratio > LANDSCAPE_THRESHOLD:
                        orientation = 'landscape'  # 横向
                    elif aspect_ratio < PORTRAIT_THRESHOLD:
                        orientation = 'portrait'   # 纵向
                    else:
                        orientation = 'square'     # 正方形
                    
                    images.append({
                        'path': filepath,
                        'filename': filename,
                        'width': width,
                        'height': height,
                        'aspect_ratio': aspect_ratio,
                        'orientation': orientation
                    })
                except Exception as e:
                    print(f"无法读取图片 {filepath}: {e}")
    
    return images


def analyze_buckets(images: List[Dict[str, Any]], n_buckets: int = 3) -> List[Dict[str, Any]]:
    """
    按长宽比分析图片，生成三个桶配置:
    - A: 横向 (Landscape) - 宽 > 高
    - B: 正方形 (Square) - 宽 ≈ 高
    - C: 纵向 (Portrait) - 高 > 宽
    
    每个桶的尺寸取该类别的中位数，然后对齐到64倍数
    """
    if len(images) == 0:
        return []
    
    # 按方向分类
    landscape_images = [img for img in images if img['orientation'] == 'landscape']
    square_images = [img for img in images if img['orientation'] == 'square']
    portrait_images = [img for img in images if img['orientation'] == 'portrait']
    
    buckets = []
    
    # 横向桶 A
    if landscape_images:
        widths = [img['width'] for img in landscape_images]
        heights = [img['height'] for img in landscape_images]
        median_width = snap_to_64(np.median(widths))
        median_height = snap_to_64(np.median(heights))
    else:
        median_width = 1024
        median_height = 768
    
    buckets.append({
        'id': 'A',
        'name': '横向 (Landscape)',
        'orientation': 'landscape',
        'width': max(64, median_width),
        'height': max(64, median_height),
        'aspect_ratio': round(median_width / median_height, 4) if median_height > 0 else 1.33,
        'image_count': len(landscape_images)
    })
    
    # 正方形桶 B
    if square_images:
        sizes = [(img['width'] + img['height']) / 2 for img in square_images]
        median_size = snap_to_64(np.median(sizes))
    else:
        median_size = 1024
    
    buckets.append({
        'id': 'B',
        'name': '正方形 (Square)',
        'orientation': 'square',
        'width': max(64, median_size),
        'height': max(64, median_size),
        'aspect_ratio': 1.0,
        'image_count': len(square_images)
    })
    
    # 纵向桶 C
    if portrait_images:
        widths = [img['width'] for img in portrait_images]
        heights = [img['height'] for img in portrait_images]
        median_width = snap_to_64(np.median(widths))
        median_height = snap_to_64(np.median(heights))
    else:
        median_width = 768
        median_height = 1024
    
    buckets.append({
        'id': 'C',
        'name': '纵向 (Portrait)',
        'orientation': 'portrait',
        'width': max(64, median_width),
        'height': max(64, median_height),
        'aspect_ratio': round(median_width / median_height, 4) if median_height > 0 else 0.75,
        'image_count': len(portrait_images)
    })
    
    return buckets


def assign_images_to_buckets(images: List[Dict[str, Any]], buckets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    根据图片方向将图片分配到对应的桶
    """
    if not buckets:
        return images
    
    # 创建方向到桶ID的映射
    orientation_to_bucket = {}
    for bucket in buckets:
        orientation_to_bucket[bucket['orientation']] = bucket['id']
    
    for img in images:
        orientation = img.get('orientation', 'square')
        assigned_bucket = orientation_to_bucket.get(orientation, 'B')
        
        img['assigned_bucket'] = assigned_bucket
        img['cropped'] = False
        img['crop_params'] = None
    
    # 统计每个桶的图片数量
    for bucket in buckets:
        bucket['image_count'] = sum(1 for img in images if img.get('assigned_bucket') == bucket['id'])
    
    return images


def validate_bucket_size(width: int, height: int) -> Tuple[int, int, bool]:
    """
    验证并修正桶尺寸到 64 倍数
    返回: (修正后的宽度, 修正后的高度, 是否进行了修正)
    """
    new_width = snap_to_64(width)
    new_height = snap_to_64(height)
    
    # 确保最小尺寸
    new_width = max(64, new_width)
    new_height = max(64, new_height)
    
    was_modified = (new_width != width) or (new_height != height)
    
    return new_width, new_height, was_modified
