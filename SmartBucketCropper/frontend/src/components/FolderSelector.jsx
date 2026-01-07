/**
 * 文件夹选择器组件
 */
import React, { useState } from 'react';
import useImageStore from '../hooks/useImageStore';
import { scanFolder } from '../api/client';

const FolderSelector = () => {
  const { 
    folderPath, 
    setFolderPath, 
    outputDir, 
    setOutputDir,
    initializeData, 
    setLoading, 
    isLoading,
    addToast 
  } = useImageStore();

  const [inputPath, setInputPath] = useState('');
  const [inputOutputDir, setInputOutputDir] = useState('');

  const handleScan = async () => {
    if (!inputPath.trim()) {
      addToast('请输入文件夹路径', 'warning');
      return;
    }

    setLoading(true);
    setFolderPath(inputPath);
    
    // 设置默认输出目录
    const defaultOutput = inputOutputDir.trim() || `${inputPath}\\output`;
    setOutputDir(defaultOutput);
    setInputOutputDir(defaultOutput);

    try {
      const data = await scanFolder(inputPath);
      initializeData(data);
      addToast(`成功扫描 ${data.total_count} 张图片`, 'success');
    } catch (error) {
      addToast(error.message || '扫描失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <h2 className="text-xl font-bold text-neon-blue mb-4 flex items-center gap-2">
        <span className="text-2xl">📁</span>
        选择图片文件夹
      </h2>
      
      <div className="space-y-4">
        {/* 输入文件夹路径 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">图片文件夹路径</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="例如: D:\datasets\my_images"
              className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* 输出目录 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">输出目录 (可选)</label>
          <input
            type="text"
            value={inputOutputDir}
            onChange={(e) => setInputOutputDir(e.target.value)}
            placeholder="留空则默认保存到源文件夹下的 output 目录"
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-colors"
          />
        </div>

        {/* 扫描按钮 */}
        <button
          onClick={handleScan}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-bold text-dark-bg transition-all ${
            isLoading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-neon-blue hover:shadow-lg hover:shadow-neon-blue/30'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              正在扫描...
            </span>
          ) : (
            '🔍 开始扫描'
          )}
        </button>
      </div>

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-dark-bg rounded-lg border border-dark-border">
        <p className="text-xs text-gray-400">
          💡 支持的格式: JPG, JPEG, PNG, WEBP, BMP, TIFF, GIF
        </p>
        <p className="text-xs text-gray-400 mt-1">
          📋 会自动识别同名的 .txt / .json 标签文件并一起处理
        </p>
      </div>
    </div>
  );
};

export default FolderSelector;
