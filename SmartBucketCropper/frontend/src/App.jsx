/**
 * SmartBucketCropper 主应用组件
 * 重新设计：三个桶按方向分类（横向/正方形/纵向），网格直接拖动裁剪
 */
import React, { useState } from 'react';
import useImageStore from './hooks/useImageStore';
import { batchExport } from './api/client';
import FolderSelector from './components/FolderSelector';
import BucketSettings from './components/BucketSettings';
import ImageGridWithCrop from './components/ImageGridWithCrop';
import Toast from './components/Toast';

function App() {
  const {
    images,
    buckets,
    activeBucket,
    setActiveBucket,
    outputDir,
    isLoading,
    setLoading,
    getCroppedCount,
    getBucketsConfig,
    getExportImages,
    addToast,
  } = useImageStore();

  const [exporting, setExporting] = useState(false);

  const hasImages = images.length > 0;
  const croppedCount = getCroppedCount();
  const currentBucket = buckets.find((b) => b.id === activeBucket);

  // 导出处理
  const handleExport = async () => {
    if (croppedCount === 0) {
      addToast('请先裁剪至少一张图片', 'warning');
      return;
    }

    setExporting(true);
    try {
      const result = await batchExport(
        getExportImages(),
        getBucketsConfig(),
        outputDir
      );

      if (result.success > 0) {
        addToast(
          `导出完成！成功 ${result.success} 张，跳过 ${result.skipped} 张`,
          'success'
        );
      }

      if (result.failed > 0) {
        addToast(`${result.failed} 张图片导出失败`, 'error');
      }
    } catch (error) {
      addToast(error.message || '导出失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  // 获取桶图标
  const getBucketIcon = (orientation) => {
    switch (orientation) {
      case 'landscape':
        return '🖼️'; // 横向
      case 'square':
        return '⬛'; // 正方形
      case 'portrait':
        return '📱'; // 纵向
      default:
        return '📷';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 头部 */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xl">
                🖼️
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SmartBucketCropper</h1>
                <p className="text-xs text-gray-400">智能图片分桶裁剪工具</p>
              </div>
            </div>

            {hasImages && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  共 <span className="text-cyan-400 font-bold">{images.length}</span> 张图片，
                  已裁剪 <span className="text-green-400 font-bold">{croppedCount}</span> 张
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting || croppedCount === 0}
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${
                    exporting || croppedCount === 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 text-gray-900 hover:bg-green-400 hover:shadow-lg hover:shadow-green-500/30'
                  }`}
                >
                  {exporting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      导出中...
                    </span>
                  ) : (
                    `📦 导出 (${croppedCount})`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-6">
        {!hasImages ? (
          /* 未加载图片时显示文件夹选择器 */
          <div className="max-w-xl mx-auto">
            <FolderSelector />

            {/* 使用说明 */}
            <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-400 mb-4">📋 使用说明</h3>
              <ol className="space-y-3 text-sm text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">1</span>
                  <span>输入包含训练图片的文件夹路径，点击"开始扫描"</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span>系统会自动按<strong className="text-cyan-400">长宽比</strong>分类为三个桶：横向(宽&gt;高)、正方形、纵向(高&gt;宽)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span>在网格中<strong className="text-cyan-400">直接拖动</strong>裁剪框调整位置，裁剪框会锁定目标比例</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">4</span>
                  <span>完成后点击"导出"，系统会使用 LANCZOS 算法处理图片</span>
                </li>
              </ol>

              <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-xs text-green-400 flex items-center gap-2">
                  <span>⚡</span>
                  所有尺寸自动对齐到 64 的倍数，优化 GPU 显存效率
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* 已加载图片时显示工作区 */
          <div className="space-y-6">
            {/* 顶部：三个桶选项卡 */}
            <div className="flex items-center gap-4 border-b border-gray-700 pb-4">
              {buckets.map((bucket) => {
                const bucketImages = images.filter(img => img.assigned_bucket === bucket.id);
                const croppedInBucket = bucketImages.filter(img => img.cropped).length;
                const isActive = activeBucket === bucket.id;
                
                return (
                  <button
                    key={bucket.id}
                    onClick={() => setActiveBucket(bucket.id)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                        : 'bg-gray-800 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{getBucketIcon(bucket.orientation)}</span>
                    <div className="text-left">
                      <div className="font-bold">{bucket.name}</div>
                      <div className="text-xs opacity-75">
                        {bucket.width} × {bucket.height} | {bucketImages.length} 张
                        {croppedInBucket > 0 && (
                          <span className="text-green-400 ml-1">({croppedInBucket} ✓)</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {/* 桶尺寸设置按钮 */}
              <div className="ml-auto">
                <BucketSettings bucket={currentBucket} compact={true} />
              </div>
            </div>

            {/* 输出目录 */}
            <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-sm">📁 输出目录:</span>
              <span className="text-sm text-white">{outputDir}</span>
            </div>

            {/* 图片网格 (带裁剪功能) */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <ImageGridWithCrop bucketId={activeBucket} />
            </div>
          </div>
        )}
      </main>

      {/* 底部信息 */}
      <footer className="border-t border-gray-800 mt-8 py-4">
        <div className="container mx-auto px-4 text-center text-xs text-gray-500">
          SmartBucketCropper v1.0 • 为深度学习训练数据集优化 • 64px Alignment
        </div>
      </footer>

      {/* Toast 通知 */}
      <Toast />
    </div>
  );
}

export default App;
