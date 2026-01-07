/**
 * 图片网格组件
 * 显示当前桶中的所有图片，支持点击裁剪
 */
import React from 'react';
import useImageStore from '../hooks/useImageStore';
import { getImageUrl } from '../api/client';

const ImageGrid = () => {
  const { 
    images, 
    activeBucket, 
    buckets,
    openCropModal 
  } = useImageStore();

  // 获取当前桶的图片
  const currentBucketImages = images.filter(
    (img) => img.assigned_bucket === activeBucket
  );

  // 获取当前桶配置
  const currentBucket = buckets.find((b) => b.id === activeBucket);

  if (currentBucketImages.length === 0) {
    return (
      <div className="bg-dark-card rounded-xl p-8 border border-dark-border text-center">
        <div className="text-4xl mb-4">📷</div>
        <p className="text-gray-400">此桶中暂无图片</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">
          Bucket {activeBucket} 图片
          <span className="text-sm text-gray-400 ml-2">
            ({currentBucketImages.length} 张)
          </span>
        </h3>
        {currentBucket && (
          <span className="text-sm text-neon-blue">
            目标尺寸: {currentBucket.width} × {currentBucket.height}
          </span>
        )}
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {currentBucketImages.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            bucket={currentBucket}
            onCrop={() => openCropModal(image)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 单个图片卡片
 */
const ImageCard = ({ image, bucket, onCrop }) => {
  const { images, activeBucket } = useImageStore();
  
  // 检查是否在其他桶中已被裁剪
  const isCroppedInOtherBucket = image.cropped && image.assigned_bucket !== activeBucket;
  const isCroppedInCurrentBucket = image.cropped && image.assigned_bucket === activeBucket;

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border transition-all cursor-pointer ${
        isCroppedInCurrentBucket
          ? 'border-neon-green shadow-lg shadow-neon-green/20'
          : 'border-dark-border hover:border-neon-blue'
      }`}
      onClick={onCrop}
    >
      {/* 图片 */}
      <div className="aspect-square bg-dark-bg">
        <img
          src={getImageUrl(image.path)}
          alt={image.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* 已裁剪标记 */}
      {isCroppedInCurrentBucket && (
        <div className="cropped-badge">
          ✓ 已裁剪
        </div>
      )}

      {/* 在其他桶中已裁剪的锁定遮罩 */}
      {isCroppedInOtherBucket && (
        <div className="locked-overlay">
          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <div className="text-sm text-gray-300">已在 Bucket {image.assigned_bucket} 裁剪</div>
          </div>
        </div>
      )}

      {/* 悬浮信息 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{image.filename}</p>
        <p className="text-xs text-gray-400">
          {image.width} × {image.height}
        </p>
      </div>

      {/* 点击提示 */}
      {!isCroppedInOtherBucket && (
        <div className="absolute inset-0 bg-neon-blue/0 group-hover:bg-neon-blue/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-dark-bg/90 px-3 py-1 rounded-full text-sm text-neon-blue">
            {isCroppedInCurrentBucket ? '重新裁剪' : '点击裁剪'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageGrid;
