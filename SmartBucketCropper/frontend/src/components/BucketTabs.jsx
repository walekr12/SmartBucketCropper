/**
 * 桶选项卡组件
 * 显示三个桶的切换标签
 */
import React from 'react';
import useImageStore from '../hooks/useImageStore';

const BucketTabs = () => {
  const { buckets, activeBucket, setActiveBucket, images } = useImageStore();

  if (buckets.length === 0) return null;

  // 计算每个桶中已裁剪的图片数量
  const getCroppedCountForBucket = (bucketId) => {
    return images.filter(
      (img) => img.assigned_bucket === bucketId && img.cropped
    ).length;
  };

  const getTotalCountForBucket = (bucketId) => {
    return images.filter((img) => img.assigned_bucket === bucketId).length;
  };

  return (
    <div className="flex gap-2 mb-4">
      {buckets.map((bucket) => {
        const isActive = activeBucket === bucket.id;
        const croppedCount = getCroppedCountForBucket(bucket.id);
        const totalCount = getTotalCountForBucket(bucket.id);
        const allCropped = croppedCount === totalCount && totalCount > 0;

        return (
          <button
            key={bucket.id}
            onClick={() => setActiveBucket(bucket.id)}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-neon-blue text-dark-bg shadow-lg shadow-neon-blue/30'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold">Bucket {bucket.id}</span>
              {allCropped && (
                <span className="text-neon-green">✓</span>
              )}
            </div>
            <div className="text-xs mt-1 opacity-80">
              {bucket.width} × {bucket.height}
            </div>
            <div className="text-xs mt-1">
              <span className={croppedCount > 0 ? 'text-neon-green' : ''}>
                {croppedCount}
              </span>
              <span className="opacity-60"> / {totalCount} 已裁剪</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default BucketTabs;
