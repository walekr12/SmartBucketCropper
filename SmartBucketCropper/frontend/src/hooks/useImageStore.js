/**
 * 全局状态管理 (Zustand)
 * 管理图片、桶配置和裁剪状态
 */
import { create } from 'zustand';

/**
 * 四舍五入到最近的 64 倍数
 */
const snapTo64 = (value) => Math.round(value / 64) * 64;

const useImageStore = create((set, get) => ({
  // 状态
  images: [],
  buckets: [],
  activeBucket: 'A',
  folderPath: '',
  outputDir: '',
  isLoading: false,
  error: null,
  toasts: [],
  cropModalOpen: false,
  selectedImage: null,

  // 设置文件夹路径
  setFolderPath: (path) => set({ folderPath: path }),

  // 设置输出目录
  setOutputDir: (dir) => set({ outputDir: dir }),

  // 设置加载状态
  setLoading: (loading) => set({ isLoading: loading }),

  // 设置错误
  setError: (error) => set({ error }),

  // 初始化数据 (扫描后)
  initializeData: (data) => {
    const { images, buckets, total_count } = data;
    set({
      images: images.map((img, index) => ({
        ...img,
        id: index,
        cropped: false,
        crop_params: null,
      })),
      buckets: buckets.map((bucket) => ({
        ...bucket,
        originalWidth: bucket.width,
        originalHeight: bucket.height,
      })),
      error: null,
    });
  },

  // 切换活动桶
  setActiveBucket: (bucketId) => set({ activeBucket: bucketId }),

  // 更新桶尺寸
  updateBucketSize: (bucketId, width, height) => {
    const { buckets, images } = get();
    
    // 强制对齐到 64 倍数
    const newWidth = snapTo64(width);
    const newHeight = snapTo64(height);
    const wasModified = newWidth !== width || newHeight !== height;

    // 更新桶配置
    const updatedBuckets = buckets.map((bucket) =>
      bucket.id === bucketId
        ? { ...bucket, width: newWidth, height: newHeight, aspect_ratio: newWidth / newHeight }
        : bucket
    );

    // 更新分配到该桶的图片的默认裁剪区域
    const targetBucket = updatedBuckets.find((b) => b.id === bucketId);
    const updatedImages = images.map((img) => {
      if (img.assigned_bucket === bucketId && !img.cropped) {
        const targetRatio = targetBucket.width / targetBucket.height;
        const currentRatio = img.width / img.height;

        let cropWidth, cropHeight, x, y;
        if (currentRatio > targetRatio) {
          cropHeight = img.height;
          cropWidth = Math.floor(img.height * targetRatio);
          x = Math.floor((img.width - cropWidth) / 2);
          y = 0;
        } else {
          cropWidth = img.width;
          cropHeight = Math.floor(img.width / targetRatio);
          x = 0;
          y = Math.floor((img.height - cropHeight) / 2);
        }

        return {
          ...img,
          default_crop: { x, y, width: cropWidth, height: cropHeight },
        };
      }
      return img;
    });

    set({ buckets: updatedBuckets, images: updatedImages });

    // 如果尺寸被修正，显示提示
    if (wasModified) {
      get().addToast('已自动对齐到 64 倍数以优化显存效率', 'info');
    }

    return { newWidth, newHeight, wasModified };
  },

  // 打开裁剪弹窗
  openCropModal: (image) => {
    set({ cropModalOpen: true, selectedImage: image });
  },

  // 关闭裁剪弹窗
  closeCropModal: () => {
    set({ cropModalOpen: false, selectedImage: null });
  },

  // 保存裁剪参数
  saveCropParams: (imageId, cropParams) => {
    const { images } = get();
    const updatedImages = images.map((img) =>
      img.id === imageId
        ? { ...img, cropped: true, crop_params: cropParams }
        : img
    );
    set({ images: updatedImages, cropModalOpen: false, selectedImage: null });
    get().addToast('��剪已保存', 'success');
  },

  // 更新图片裁剪参数 (通过路径)
  updateImageCrop: (imagePath, cropParams) => {
    const { images } = get();
    const updatedImages = images.map((img) =>
      img.path === imagePath
        ? { ...img, cropped: true, crop_params: cropParams, savedAt: Date.now() }
        : img
    );
    set({ images: updatedImages });
  },

  // 移动图片到其他桶
  moveImageToBucket: (imagePath, newBucketId) => {
    const { images, buckets } = get();
    const bucket = buckets.find(b => b.id === newBucketId);
    if (!bucket) return;

    const updatedImages = images.map((img) => {
      if (img.path === imagePath) {
        // 重新计算默认裁剪区域
        const targetRatio = bucket.width / bucket.height;
        const currentRatio = img.width / img.height;
        
        let cropWidth, cropHeight, x, y;
        if (currentRatio > targetRatio) {
          cropHeight = img.height;
          cropWidth = Math.floor(img.height * targetRatio);
          x = Math.floor((img.width - cropWidth) / 2);
          y = 0;
        } else {
          cropWidth = img.width;
          cropHeight = Math.floor(img.width / targetRatio);
          x = 0;
          y = Math.floor((img.height - cropHeight) / 2);
        }

        return {
          ...img,
          assigned_bucket: newBucketId,
          cropped: false,
          crop_params: null,
          savedAt: null,
          default_crop: { x, y, width: cropWidth, height: cropHeight }
        };
      }
      return img;
    });

    // 更新桶的图片计数
    const updatedBuckets = buckets.map(b => ({
      ...b,
      image_count: updatedImages.filter(img => img.assigned_bucket === b.id).length
    }));

    set({ images: updatedImages, buckets: updatedBuckets });
    get().addToast(`已移动到 ${bucket.name}`, 'success');
  },

  // 保存所有裁剪（标记所有图片为已保存）
  saveAllCrops: (bucketId) => {
    const { images } = get();
    const now = Date.now();
    const updatedImages = images.map((img) => {
      if (img.assigned_bucket === bucketId && img.default_crop) {
        // 如果还没有裁剪参数，使用默认裁剪
        return {
          ...img,
          cropped: true,
          crop_params: img.crop_params || img.default_crop,
          savedAt: now
        };
      }
      return img;
    });
    set({ images: updatedImages });
    get().addToast('已保存当前桶的所有裁剪', 'success');
  },

  // 获取排序后的图片（未保存的在前，已保存的在后）
  getSortedImagesForBucket: (bucketId) => {
    const { images } = get();
    const bucketImages = images.filter(img => img.assigned_bucket === bucketId);
    
    // 排序：未保存的在前，已保存的按保存时间排序
    return bucketImages.sort((a, b) => {
      if (!a.savedAt && b.savedAt) return -1;
      if (a.savedAt && !b.savedAt) return 1;
      if (a.savedAt && b.savedAt) return a.savedAt - b.savedAt;
      return 0;
    });
  },

  // 重置图片裁剪状态
  resetImageCrop: (imageId) => {
    const { images } = get();
    const updatedImages = images.map((img) =>
      img.id === imageId
        ? { ...img, cropped: false, crop_params: null }
        : img
    );
    set({ images: updatedImages });
  },

  // 获取当前桶的图片
  getImagesForBucket: (bucketId) => {
    const { images } = get();
    return images.filter((img) => img.assigned_bucket === bucketId);
  },

  // 获取已裁剪的图片数量
  getCroppedCount: () => {
    const { images } = get();
    return images.filter((img) => img.cropped).length;
  },

  // 获取桶配置 (用于导出)
  getBucketsConfig: () => {
    const { buckets } = get();
    const config = {};
    buckets.forEach((bucket) => {
      config[bucket.id] = { width: bucket.width, height: bucket.height };
    });
    return config;
  },

  // 获取要导出的图片数据
  getExportImages: () => {
    const { images } = get();
    return images.map((img) => ({
      path: img.path,
      filename: img.filename,
      assigned_bucket: img.assigned_bucket,
      cropped: img.cropped,
      crop_params: img.crop_params,
    }));
  },

  // Toast 通知
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // 3秒后自动移除
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // 重置所有状态
  reset: () => {
    set({
      images: [],
      buckets: [],
      activeBucket: 'A',
      folderPath: '',
      outputDir: '',
      isLoading: false,
      error: null,
      cropModalOpen: false,
      selectedImage: null,
    });
  },
}));

export { useImageStore };
export default useImageStore;
