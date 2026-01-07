/**
 * 裁剪弹窗组件
 * 使用 react-easy-crop 实现图片裁剪
 */
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import useImageStore from '../hooks/useImageStore';
import { getImageUrl } from '../api/client';

const CropModal = () => {
  const {
    cropModalOpen,
    selectedImage,
    closeCropModal,
    saveCropParams,
    buckets,
    activeBucket,
  } = useImageStore();

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // 获取当前桶配置
  const currentBucket = buckets.find((b) => b.id === activeBucket);
  const aspectRatio = currentBucket
    ? currentBucket.width / currentBucket.height
    : 1;

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    if (croppedAreaPixels && selectedImage) {
      saveCropParams(selectedImage.id, {
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      });
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    closeCropModal();
  };

  if (!cropModalOpen || !selectedImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-card rounded-xl border border-dark-border w-[90vw] max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div>
            <h2 className="text-xl font-bold text-white">裁剪图片</h2>
            <p className="text-sm text-gray-400 mt-1">
              {selectedImage.filename} • 原始尺寸: {selectedImage.width} × {selectedImage.height}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-neon-blue">
              目标: {currentBucket?.width} × {currentBucket?.height}
              <span className="ml-2 px-2 py-0.5 bg-neon-green/20 text-neon-green text-xs rounded">
                64px Aligned
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 裁剪区域 */}
        <div className="relative flex-1 min-h-[400px] bg-dark-bg">
          <Cropper
            image={getImageUrl(selectedImage.path)}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            cropShape="rect"
            showGrid={true}
            style={{
              containerStyle: {
                backgroundColor: '#0d0d1a',
              },
              cropAreaStyle: {
                border: '2px solid #00d9ff',
                boxShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
              },
            }}
          />
        </div>

        {/* 控制面板 */}
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-6 mb-4">
            {/* 缩放控制 */}
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">
                缩放: {zoom.toFixed(2)}x
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-neon-blue"
              />
            </div>

            {/* 裁剪信息 */}
            {croppedAreaPixels && (
              <div className="text-sm text-gray-400">
                裁剪区域: {Math.round(croppedAreaPixels.width)} × {Math.round(croppedAreaPixels.height)}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-lg font-bold bg-dark-bg border border-dark-border text-gray-400 hover:text-white hover:border-gray-500 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-lg font-bold bg-neon-green text-dark-bg hover:shadow-lg hover:shadow-neon-green/30 transition-all"
            >
              ✓ 确认裁剪
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropModal;
