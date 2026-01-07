/**
 * 图片网格组件 - 支持直接在网格中拖动裁剪
 * 功能：拖动裁剪、移动到其他桶、等比缩放（+/-按钮）、保存后排序锁定
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImageStore } from '../hooks/useImageStore';

// 获取图片URL
const getImageUrl = (path) => `/api/image/${encodeURIComponent(path)}`;

// 桶名称映射
const BUCKET_INFO = {
  'A': { name: '横向', icon: '🖼️' },
  'B': { name: '正方形', icon: '⬛' }, 
  'C': { name: '纵向', icon: '📱' }
};

/**
 * 单个图片裁剪卡片
 */
const ImageCropCard = ({ image, bucket, onCropChange, onMoveToBucket, buckets, onToggleScale, onScaleChange }) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  
  // 是否已锁定（保存过）
  const isLocked = !!image.savedAt;
  
  // 等比缩放模式 - 直接从 image 读取
  const useScaling = image.useScaling === true;
  const scale = image.scale || 1.0;
  
  // 计算目标比例和图片比例
  const targetRatio = bucket.width / bucket.height;
  const imageRatio = image.width / image.height;
  
  // 容器尺寸
  const containerHeight = 180;
  const containerWidth = 280;
  
  // 裁剪框尺寸 (固定在容器中央，按目标比例)
  let cropBoxWidth, cropBoxHeight;
  if (containerWidth / containerHeight > targetRatio) {
    cropBoxHeight = containerHeight - 20;
    cropBoxWidth = cropBoxHeight * targetRatio;
  } else {
    cropBoxWidth = containerWidth - 20;
    cropBoxHeight = cropBoxWidth / targetRatio;
  }
  
  // 计算图片显示尺寸
  let baseImgWidth, baseImgHeight;
  if (useScaling) {
    // 等比缩放模式：图片可以缩放
    if (imageRatio > targetRatio) {
      baseImgHeight = cropBoxHeight;
      baseImgWidth = baseImgHeight * imageRatio;
    } else {
      baseImgWidth = cropBoxWidth;
      baseImgHeight = baseImgWidth / imageRatio;
    }
  } else {
    // 普通模式：图片填满容器
    if (imageRatio > containerWidth / containerHeight) {
      baseImgWidth = containerWidth;
      baseImgHeight = containerWidth / imageRatio;
    } else {
      baseImgHeight = containerHeight;
      baseImgWidth = containerHeight * imageRatio;
    }
  }
  
  // 应用缩放
  const displayImgWidth = baseImgWidth * scale;
  const displayImgHeight = baseImgHeight * scale;
  
  // 裁剪框位置（始终居中）
  const cropBoxLeft = (containerWidth - cropBoxWidth) / 2;
  const cropBoxTop = (containerHeight - cropBoxHeight) / 2;
  
  // 计算可拖动范围
  const minX = cropBoxLeft + cropBoxWidth - displayImgWidth;
  const maxX = cropBoxLeft;
  const minY = cropBoxTop + cropBoxHeight - displayImgHeight;
  const maxY = cropBoxTop;
  
  // 初始化位置（居中）
  useEffect(() => {
    const centerX = cropBoxLeft - (displayImgWidth - cropBoxWidth) / 2;
    const centerY = cropBoxTop - (displayImgHeight - cropBoxHeight) / 2;
    
    if (image.crop_params && !useScaling) {
      const scaleX = displayImgWidth / image.width;
      const scaleY = displayImgHeight / image.height;
      setPosition({
        x: Math.max(minX, Math.min(maxX, cropBoxLeft - image.crop_params.x * scaleX)),
        y: Math.max(minY, Math.min(maxY, cropBoxTop - image.crop_params.y * scaleY))
      });
    } else {
      setPosition({ x: centerX, y: centerY });
    }
  }, [image.path, bucket.id, useScaling, scale]);
  
  const handleMouseDown = (e) => {
    if (isLocked) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    // 限制范围，确保裁剪框内始终有图片
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, minX, maxX, minY, maxY]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // 计算实际裁剪参数
      const scaleX = image.width / displayImgWidth;
      const scaleY = image.height / displayImgHeight;
      const cropParams = {
        x: Math.round((cropBoxLeft - position.x) * scaleX),
        y: Math.round((cropBoxTop - position.y) * scaleY),
        width: Math.round(cropBoxWidth * scaleX),
        height: Math.round(cropBoxHeight * scaleY),
        scale: scale,
        useScaling: useScaling
      };
      onCropChange(image.path, cropParams);
    }
  }, [isDragging, position, image, displayImgWidth, displayImgHeight, cropBoxWidth, cropBoxHeight, cropBoxLeft, cropBoxTop, scale, useScaling, onCropChange]);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // 其他桶选项
  const otherBuckets = buckets.filter(b => b.id !== bucket.id);
  
  // 缩放控制
  const handleZoomIn = (e) => {
    e.stopPropagation();
    const newScale = Math.min(3.0, scale + 0.1);
    onScaleChange(image.path, newScale);
  };
  
  const handleZoomOut = (e) => {
    e.stopPropagation();
    const newScale = Math.max(0.5, scale - 0.1);
    onScaleChange(image.path, newScale);
  };
  
  const handleToggle = (e) => {
    e.stopPropagation();
    onToggleScale(image.path);
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden border transition-all ${
      isLocked ? 'border-green-600 opacity-75' : 'border-gray-700 hover:border-cyan-500'
    }`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-900 border-b border-gray-700">
        {/* 移动到其他桶 */}
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
            disabled={isLocked}
          >
            <span>移动→</span>
          </button>
          {showMoveMenu && !isLocked && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl z-20">
              {otherBuckets.map(b => (
                <button
                  key={b.id}
                  onClick={() => { onMoveToBucket(image.path, b.id); setShowMoveMenu(false); }}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-700 whitespace-nowrap"
                >
                  {BUCKET_INFO[b.id]?.icon} {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 等比缩放开关 + 缩放控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={isLocked}
            className={`text-xs px-2 py-1 rounded ${
              useScaling 
                ? 'bg-yellow-600 text-black font-bold' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
            }`}
          >
            {useScaling ? '✓ 缩放模式' : '缩放'}
          </button>
          
          {/* 缩放 +/- 按钮 - 始终显示当开启缩放时 */}
          {useScaling && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={isLocked}
                className="w-6 h-6 bg-blue-600 hover:bg-blue-500 rounded text-white text-lg font-bold flex items-center justify-center"
              >
                −
              </button>
              <span className="text-xs text-blue-400 w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
              <button
                onClick={handleZoomIn}
                disabled={isLocked}
                className="w-6 h-6 bg-blue-600 hover:bg-blue-500 rounded text-white text-lg font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          )}
        </div>
        
        {/* 锁定标记 */}
        {isLocked && (
          <span className="text-green-400 text-xs">🔒</span>
        )}
      </div>
      
      {/* 图片容器 */}
      <div 
        ref={containerRef}
        className="relative bg-black overflow-hidden"
        style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
      >
        {/* 暗色背景遮罩 */}
        <div className="absolute inset-0 bg-black/60 z-0"></div>
        
        {/* 可拖动的图片 */}
        <img
          src={getImageUrl(image.path)}
          alt={image.filename}
          className={`absolute z-10 ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
          style={{
            width: `${displayImgWidth}px`,
            height: `${displayImgHeight}px`,
            left: `${position.x}px`,
            top: `${position.y}px`,
            userSelect: 'none',
            pointerEvents: isLocked ? 'none' : 'auto'
          }}
          onMouseDown={handleMouseDown}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
        
        {/* 裁剪框（只显示边框，不遮挡） */}
        <div 
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${cropBoxLeft}px`,
            top: `${cropBoxTop}px`,
            width: `${cropBoxWidth}px`,
            height: `${cropBoxHeight}px`,
            border: isLocked ? '2px solid #22c55e' : '2px solid #00d9ff',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
          }}
        >
          {/* 角标 */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
        </div>
      </div>
      
      {/* 文件名和尺寸 */}
      <div className="px-2 py-1.5 bg-gray-850 border-t border-gray-700 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-400 truncate max-w-[180px]">{image.filename}</p>
          <p className="text-xs text-gray-500">{image.width} × {image.height}</p>
        </div>
        {useScaling && (
          <span className="text-xs bg-yellow-600 text-black px-1.5 py-0.5 rounded font-bold">{Math.round(scale * 100)}%</span>
        )}
      </div>
    </div>
  );
};

/**
 * 图片网格
 */
const ImageGridWithCrop = ({ bucketId }) => {
  // 使用选择器订阅特定状态，确保状态变化时重新渲染
  const images = useImageStore(state => state.images);
  const buckets = useImageStore(state => state.buckets);
  const updateImageCrop = useImageStore(state => state.updateImageCrop);
  const moveImageToBucket = useImageStore(state => state.moveImageToBucket);
  const saveAllCrops = useImageStore(state => state.saveAllCrops);
  
  const bucket = buckets.find(b => b.id === bucketId) || buckets[0];
  
  // 获取当前桶的图片（不自动排序，只有保存后才排序）
  const bucketImages = images.filter(img => img.assigned_bucket === bucketId);
  
  // 统计
  const unsavedCount = bucketImages.filter(img => !img.savedAt).length;
  const savedCount = bucketImages.filter(img => img.savedAt).length;
  
  // 保存后排序显示（本地状态）
  const [sortedImages, setSortedImages] = useState([]);
  
  // 初始化和图片变化时更新
  useEffect(() => {
    setSortedImages(bucketImages);
  }, [bucketId, images.length]);
  
  const handleCropChange = useCallback((imagePath, cropParams) => {
    updateImageCrop(imagePath, cropParams);
  }, [updateImageCrop]);
  
  // 切换缩放模式
  const handleToggleScale = useCallback((imagePath) => {
    useImageStore.setState(state => ({
      images: state.images.map(img => 
        img.path === imagePath 
          ? { ...img, useScaling: !img.useScaling, scale: img.scale || 1.0 } 
          : img
      )
    }));
  }, []);
  
  // 修改缩放值
  const handleScaleChange = useCallback((imagePath, newScale) => {
    useImageStore.setState(state => ({
      images: state.images.map(img => 
        img.path === imagePath ? { ...img, scale: newScale } : img
      )
    }));
  }, []);
  
  // 全部保存后重新排序
  const handleSaveAll = async () => {
    await saveAllCrops(bucketId);
    
    // 保存后重新排序：未保存在前，已保存在后
    const { images: updatedImages } = useImageStore.getState();
    const currentBucketImages = updatedImages.filter(img => img.assigned_bucket === bucketId);
    const sorted = [...currentBucketImages].sort((a, b) => {
      if (!a.savedAt && b.savedAt) return -1;
      if (a.savedAt && !b.savedAt) return 1;
      if (a.savedAt && b.savedAt) return a.savedAt - b.savedAt;
      return 0;
    });
    setSortedImages(sorted);
  };
  
  if (!bucket) return <div className="p-4 text-gray-500">请先扫描文件夹</div>;
  
  if (bucketImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <span className="text-4xl mb-4">📭</span>
        <p>此分类暂无图片</p>
      </div>
    );
  }
  
  // 使用排序后的图片（如果有），否则用原始顺序
  const displayImages = sortedImages.length > 0 ? sortedImages : bucketImages;
  
  return (
    <div className="p-4">
      {/* 顶部操作栏 */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-cyan-400">{bucket.name}</span>
          <span className="px-2 py-1 bg-gray-700 rounded text-sm">{bucket.width} × {bucket.height}</span>
          <span className="px-2 py-1 bg-green-900 text-green-400 rounded text-xs">64px 对齐</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            待处理: <span className="text-yellow-400 font-bold">{unsavedCount}</span> | 
            已保存: <span className="text-green-400 font-bold">{savedCount}</span>
          </span>
          <button
            onClick={handleSaveAll}
            disabled={unsavedCount === 0}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              unsavedCount > 0 
                ? 'bg-green-600 hover:bg-green-500 text-white' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            💾 全部保存 ({unsavedCount})
          </button>
        </div>
      </div>
      
      {/* 图片网格 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {displayImages.map((image) => (
          <ImageCropCard
            key={image.path}
            image={image}
            bucket={bucket}
            buckets={buckets}
            onCropChange={handleCropChange}
            onMoveToBucket={moveImageToBucket}
            onToggleScale={handleToggleScale}
            onScaleChange={handleScaleChange}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageGridWithCrop;
