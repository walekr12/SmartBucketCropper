/**
 * API 客户端
 * 封装与后端的通信
 */
import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || '请求失败';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

/**
 * 扫描文件夹
 */
export async function scanFolder(folderPath) {
  return client.post('/scan/folder', { folder_path: folderPath });
}

/**
 * 验证并修正桶尺寸
 */
export async function validateBucket(width, height) {
  return client.post('/scan/validate-bucket', { width, height });
}

/**
 * 获取图片缩略图
 */
export async function getThumbnail(imagePath) {
  return client.get(`/scan/thumbnail/${encodeURIComponent(imagePath)}`);
}

/**
 * 批量导出
 */
export async function batchExport(images, buckets, outputDir, copyCompanions = true) {
  return client.post('/export/batch', {
    images,
    buckets,
    output_dir: outputDir,
    copy_companions: copyCompanions,
  });
}

/**
 * 预览裁剪效果
 */
export async function previewCrop(imagePath, cropParams, bucketWidth, bucketHeight) {
  const params = new URLSearchParams({
    image_path: imagePath,
    bucket_width: bucketWidth,
    bucket_height: bucketHeight,
  });
  return client.post(`/export/preview?${params}`, cropParams);
}

/**
 * 获取图片 URL (通过后端代理)
 */
export function getImageUrl(imagePath) {
  return `${API_BASE}/image/${encodeURIComponent(imagePath)}`;
}

export default client;
