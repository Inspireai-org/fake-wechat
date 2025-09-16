// 导出Web Worker
// 处理视频和GIF编码的后台任务

// Worker状态
let isExporting = false;
let currentExportId = null;

// 消息处理器
self.onmessage = function(event) {
  const { type, payload } = event.data;

  switch (type) {
    case 'START_EXPORT':
      handleStartExport(payload);
      break;
    case 'CANCEL_EXPORT':
      handleCancelExport();
      break;
    default:
      console.warn('未知的Worker消息类型:', type);
  }
};

// 开始导出处理
async function handleStartExport(payload) {
  const { frames, config, totalFrames } = payload;
  
  if (isExporting) {
    postMessage({
      type: 'EXPORT_ERROR',
      payload: { error: '导出正在进行中' }
    });
    return;
  }

  isExporting = true;
  currentExportId = Date.now();
  const exportId = currentExportId;

  try {
    // 发送准备阶段进度
    postProgress({
      phase: 'preparing',
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      estimatedTimeRemaining: 0,
      currentFileSize: 0
    });

    let result;
    
    switch (config.format) {
      case 'gif':
        result = await encodeAsGif(frames, config, exportId);
        break;
      case 'mp4':
        result = await encodeAsVideo(frames, config, 'video/mp4', exportId);
        break;
      case 'webm':
        result = await encodeAsVideo(frames, config, 'video/webm', exportId);
        break;
      default:
        throw new Error(`不支持的导出格式: ${config.format}`);
    }

    // 检查是否被取消
    if (currentExportId !== exportId) {
      return;
    }

    // 发送完成消息
    postMessage({
      type: 'EXPORT_COMPLETE',
      payload: result
    });

  } catch (error) {
    // 检查是否被取消
    if (currentExportId !== exportId) {
      return;
    }

    postMessage({
      type: 'EXPORT_ERROR',
      payload: { error: error.message || '导出失败' }
    });
  } finally {
    if (currentExportId === exportId) {
      isExporting = false;
      currentExportId = null;
    }
  }
}

// 取消导出
function handleCancelExport() {
  isExporting = false;
  currentExportId = null;
  
  postMessage({
    type: 'EXPORT_CANCELLED',
    payload: {}
  });
}

// 发送进度更新
function postProgress(progress) {
  postMessage({
    type: 'PROGRESS_UPDATE',
    payload: progress
  });
}

// GIF编码
async function encodeAsGif(frames, config, exportId) {
  const startTime = Date.now();
  
  // 动态导入gif.js（如果在Worker中可用）
  // 注意：实际实现中可能需要将gif.js库复制到worker目录
  
  return new Promise((resolve, reject) => {
    try {
      // 模拟GIF编码过程
      const totalFrames = frames.length;
      let processedFrames = 0;
      
      // 创建模拟的编码过程
      const processFrame = () => {
        if (currentExportId !== exportId) {
          reject(new Error('导出已取消'));
          return;
        }

        processedFrames++;
        
        // 发送编码进度
        postProgress({
          phase: 'encoding',
          currentFrame: processedFrames,
          totalFrames,
          percentage: 50 + (processedFrames / totalFrames) * 40,
          estimatedTimeRemaining: calculateEstimatedTime(processedFrames, totalFrames, startTime),
          currentFileSize: estimateFileSize(processedFrames, totalFrames, config)
        });

        if (processedFrames < totalFrames) {
          // 模拟处理时间
          setTimeout(processFrame, 50);
        } else {
          // 完成编码
          postProgress({
            phase: 'finalizing',
            currentFrame: totalFrames,
            totalFrames,
            percentage: 95,
            estimatedTimeRemaining: 0,
            currentFileSize: estimateFileSize(totalFrames, totalFrames, config)
          });

          // 创建模拟的Blob结果
          const mockGifData = createMockGifBlob(frames, config);
          
          resolve({
            blob: mockGifData,
            filename: `wechat-chat-${Date.now()}.gif`,
            fileSize: mockGifData.size,
            duration: Date.now() - startTime,
            config
          });
        }
      };

      // 开始处理
      setTimeout(processFrame, 100);
      
    } catch (error) {
      reject(error);
    }
  });
}

// 视频编码
async function encodeAsVideo(frames, config, mimeType, exportId) {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    try {
      // 检查MediaRecorder支持
      if (!self.MediaRecorder) {
        reject(new Error('浏览器不支持视频录制'));
        return;
      }

      const totalFrames = frames.length;
      let processedFrames = 0;

      // 模拟视频编码过程
      const processFrame = () => {
        if (currentExportId !== exportId) {
          reject(new Error('导出已取消'));
          return;
        }

        processedFrames++;
        
        // 发送编码进度
        postProgress({
          phase: 'encoding',
          currentFrame: processedFrames,
          totalFrames,
          percentage: 50 + (processedFrames / totalFrames) * 40,
          estimatedTimeRemaining: calculateEstimatedTime(processedFrames, totalFrames, startTime),
          currentFileSize: estimateVideoFileSize(processedFrames, totalFrames, config)
        });

        if (processedFrames < totalFrames) {
          setTimeout(processFrame, 30);
        } else {
          // 完成编码
          postProgress({
            phase: 'finalizing',
            currentFrame: totalFrames,
            totalFrames,
            percentage: 95,
            estimatedTimeRemaining: 0,
            currentFileSize: estimateVideoFileSize(totalFrames, totalFrames, config)
          });

          // 创建模拟的视频Blob
          const mockVideoData = createMockVideoBlob(frames, config, mimeType);
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          
          resolve({
            blob: mockVideoData,
            filename: `wechat-chat-${Date.now()}.${extension}`,
            fileSize: mockVideoData.size,
            duration: Date.now() - startTime,
            config
          });
        }
      };

      setTimeout(processFrame, 100);
      
    } catch (error) {
      reject(error);
    }
  });
}

// 计算预估剩余时间
function calculateEstimatedTime(processed, total, startTime) {
  if (processed === 0) return 0;
  
  const elapsed = Date.now() - startTime;
  const avgTimePerFrame = elapsed / processed;
  const remaining = total - processed;
  
  return Math.round(remaining * avgTimePerFrame);
}

// 估算GIF文件大小
function estimateFileSize(processed, total, config) {
  const { width, height } = config.resolution;
  const pixelCount = width * height;
  
  // 基础估算：每像素约0.5-2字节，取决于质量
  let bytesPerPixel;
  switch (config.quality) {
    case 'high': bytesPerPixel = 2; break;
    case 'medium': bytesPerPixel = 1; break;
    case 'low': bytesPerPixel = 0.5; break;
    default: bytesPerPixel = 1;
  }
  
  const estimatedFrameSize = pixelCount * bytesPerPixel;
  const estimatedTotalSize = estimatedFrameSize * total;
  
  return Math.round((processed / total) * estimatedTotalSize);
}

// 估算视频文件大小
function estimateVideoFileSize(processed, total, config) {
  const { width, height, framerate } = config;
  const bitrate = config.customSettings?.bitrate || 1000; // kbps
  
  // 估算总时长（秒）
  const totalDuration = total / framerate;
  
  // 估算文件大小（字节）
  const estimatedSize = (bitrate * 1000 / 8) * totalDuration;
  
  return Math.round((processed / total) * estimatedSize);
}

// 创建模拟GIF Blob
function createMockGifBlob(frames, config) {
  // 在实际实现中，这里应该是真正的GIF编码逻辑
  // 现在创建一个模拟的Blob用于测试
  
  const { width, height } = config.resolution;
  const estimatedSize = estimateFileSize(frames.length, frames.length, config);
  
  // 创建模拟数据
  const mockData = new Uint8Array(Math.min(estimatedSize, 1024 * 1024)); // 最大1MB
  
  // 填充一些模拟的GIF头部数据
  const gifHeader = new TextEncoder().encode('GIF89a');
  mockData.set(gifHeader, 0);
  
  return new Blob([mockData], { type: 'image/gif' });
}

// 创建模拟视频Blob
function createMockVideoBlob(frames, config, mimeType) {
  // 在实际实现中，这里应该是真正的视频编码逻辑
  
  const estimatedSize = estimateVideoFileSize(frames.length, frames.length, config);
  const mockData = new Uint8Array(Math.min(estimatedSize, 5 * 1024 * 1024)); // 最大5MB
  
  return new Blob([mockData], { type: mimeType });
}

// 内存管理
function cleanupMemory() {
  // 清理临时数据和缓存
  if (self.gc) {
    self.gc(); // 如果支持手动垃圾回收
  }
}

// 错误处理
function handleWorkerError(error) {
  console.error('Worker错误:', error);
  
  postMessage({
    type: 'EXPORT_ERROR',
    payload: { 
      error: error.message || '未知错误',
      stack: error.stack
    }
  });
  
  // 重置状态
  isExporting = false;
  currentExportId = null;
  
  // 清理内存
  cleanupMemory();
}

// 全局错误处理
self.onerror = function(error) {
  handleWorkerError(error);
};

self.onunhandledrejection = function(event) {
  handleWorkerError(new Error(event.reason));
};

// Worker初始化完成
postMessage({
  type: 'WORKER_READY',
  payload: { 
    capabilities: {
      gif: true,
      mp4: !!self.MediaRecorder,
      webm: !!self.MediaRecorder,
      maxMemory: self.navigator?.deviceMemory || 4
    }
  }
});