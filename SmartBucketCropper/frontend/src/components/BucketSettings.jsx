/**
 * 桶设置组件
 * 显示和编辑桶的尺寸配置
 * 支持 compact 模式 (内联编辑)
 */
import React, { useState, useEffect } from 'react';
import useImageStore from '../hooks/useImageStore';

const BucketSettings = ({ bucket, compact = false }) => {
  const { updateBucketSize } = useImageStore();
  const [width, setWidth] = useState(bucket?.width || 1024);
  const [height, setHeight] = useState(bucket?.height || 1024);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (bucket) {
      setWidth(bucket.width);
      setHeight(bucket.height);
    }
  }, [bucket?.width, bucket?.height]);

  if (!bucket) return null;

  const handleBlur = (field) => {
    const newWidth = field === 'width' ? parseInt(width) || 64 : bucket.width;
    const newHeight = field === 'height' ? parseInt(height) || 64 : bucket.height;
    
    const result = updateBucketSize(bucket.id, newWidth, newHeight);
    setWidth(result.newWidth);
    setHeight(result.newHeight);
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.target.blur();
      if (compact) setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setWidth(bucket.width);
      setHeight(bucket.height);
      if (compact) setIsEditing(false);
    }
  };

  // Compact 模式：点击展开编辑
  if (compact) {
    if (!isEditing) {
      return (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-gray-300">调整尺寸</span>
        </button>
      );
    }

    // 编辑模式弹出框
    return (
      <div className="relative">
        <div className="absolute right-0 top-0 bg-gray-800 rounded-lg border border-gray-600 p-4 shadow-xl z-50 min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white">编辑桶尺寸</h4>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* 宽度输入 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">宽度 (W)</label>
              <div className="relative">
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  onBlur={() => handleBlur('width')}
                  onKeyDown={(e) => handleKeyDown(e, 'width')}
                  min={64}
                  step={64}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:border-cyan-500 focus:outline-none transition-colors"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
              </div>
            </div>

            {/* 高度输入 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">高度 (H)</label>
              <div className="relative">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  onBlur={() => handleBlur('height')}
                  onKeyDown={(e) => handleKeyDown(e, 'height')}
                  min={64}
                  step={64}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:border-cyan-500 focus:outline-none transition-colors"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <span>自动对齐到 64 倍数</span>
          </div>
        </div>
      </div>
    );
  }

  // 完整模式
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
            {bucket.id}
          </span>
          {bucket.name || `Bucket ${bucket.id}`}
        </h3>
        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
          64px Aligned ✓
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 宽度输入 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">宽度 (W)</label>
          <div className="relative">
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              onBlur={() => handleBlur('width')}
              onKeyDown={(e) => handleKeyDown(e, 'width')}
              min={64}
              step={64}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:border-cyan-500 focus:outline-none transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
          </div>
        </div>

        {/* 高度输入 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">高度 (H)</label>
          <div className="relative">
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={() => handleBlur('height')}
              onKeyDown={(e) => handleKeyDown(e, 'height')}
              min={64}
              step={64}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:border-cyan-500 focus:outline-none transition-colors"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
          </div>
        </div>
      </div>

      {/* 信息显示 */}
      <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-400">
        <span>宽高比: {bucket.aspect_ratio?.toFixed(2)}</span>
        <span>图片数: {bucket.image_count}</span>
      </div>

      {/* GPU 优化提示 */}
      <div className="mt-2 flex items-center gap-1 text-xs text-cyan-400/70">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        <span>64 倍数尺寸优化 GPU 显存效率</span>
      </div>
    </div>
  );
};

export default BucketSettings;
