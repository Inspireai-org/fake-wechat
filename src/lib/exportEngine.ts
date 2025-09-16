import { Message } from '../components/ChatInterface';

// 导出配置接口
export interface ExportConfig {
  format: 'gif' | 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low' | 'custom';
  resolution: { width: number; height: number };
  framerate: number;
  duration?: number;
  customSettings?: {
    bitrate?: number;
    compression?: number;
    colorDepth?: number;
  };
}

// 导出进度接口
export interface ExportProgress {
  phase: 'preparing' | 'capturing' | 'encoding' | 'finalizing';
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;
  currentFileSize: number;
}

// 导出结果接口
export interface ExportResult {
  blob: Blob;
  filename: string;
  fileSize: number;
  duration: number;
  config: ExportConfig;
}

// 质量预设配置
export const QUALITY_PRESETS: Record<string, Partial<ExportConfig>> = {
  high: {
    quality: 'high',
    resolution: { width: 375, height: 667 },
    framerate: 30,
    customSettings: {
      bitrate: 2000,
      compression: 0.8,
      colorDepth: 256
    }
  },
  medium: {
    quality: 'medium',
    resolution: { width: 375, height: 667 },
    framerate: 20,
    customSettings: {
      bitrate: 1000,
      compression: 0.6,
      colorDepth: 128
    }
  },
  low: {
    quality: 'low',
    resolution: { width: 375, height: 667 },
    framerate: 15,
    customSettings: {
      bitrate: 500,
      compression: 0.4,
      colorDepth: 64
    }
  }
};

// 导出引擎类
export class ExportEngine {
  private worker: Worker | null = null;
  private progressCallback: ((progress: ExportProgress) => void) | null = null;
  private isExporting = false;

  constructor() {
    this.initializeWorker();
  }

  // 初始化Web Worker
  private initializeWorker(): void {
    try {
      this.worker = new Worker('/workers/export-worker.js');
      this.setupWorkerHandlers();
    } catch (error) {
      console.warn('Web Worker不可用，将使用主线程导出:', error);
    }
  }

  // 设置Worker事件处理器
  private setupWorkerHandlers(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'PROGRESS_UPDATE':
          if (this.progressCallback) {
            this.progressCallback(payload);
          }
          break;
        case 'EXPORT_COMPLETE':
          this.handleExportComplete(payload);
          break;
        case 'EXPORT_ERROR':
          this.handleExportError(payload.error);
          break;
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker错误:', error);
      this.handleExportError('Worker执行错误');
    };
  }

  // 导出动画
  public async exportAnimation(
    messages: Message[],
    config: ExportConfig,
    chatContainerRef: React.RefObject<HTMLElement>,
    onProgress: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('导出正在进行中，请等待完成');
    }

    if (!chatContainerRef.current) {
      throw new Error('聊天容器引用无效');
    }

    this.isExporting = true;
    this.progressCallback = onProgress;

    try {
      // 合并质量预设配置
      const finalConfig = this.mergeConfigWithPreset(config);
      
      // 计算总帧数
      const totalFrames = this.calculateTotalFrames(messages, finalConfig);

      // 初始化进度
      onProgress({
        phase: 'preparing',
        currentFrame: 0,
        totalFrames,
        percentage: 0,
        estimatedTimeRemaining: 0,
        currentFileSize: 0
      });

      // 如果支持Web Worker，使用Worker导出
      if (this.worker && finalConfig.format !== 'gif') {
        return await this.exportWithWorker(messages, finalConfig, chatContainerRef, totalFrames);
      } else {
        // 否则使用主线程导出
        return await this.exportInMainThread(messages, finalConfig, chatContainerRef, totalFrames);
      }
    } finally {
      this.isExporting = false;
      this.progressCallback = null;
    }
  }

  // 使用Web Worker导出
  private async exportWithWorker(
    messages: Message[],
    config: ExportConfig,
    chatContainerRef: React.RefObject<HTMLElement>,
    totalFrames: number
  ): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker不可用'));
        return;
      }

      // 捕获所有帧
      this.captureFrames(messages, config, chatContainerRef)
        .then(frames => {
          // 发送数据到Worker进行编码
          this.worker!.postMessage({
            type: 'START_EXPORT',
            payload: {
              frames,
              config,
              totalFrames
            }
          });

          // 设置完成和错误处理器
          const handleComplete = (result: ExportResult) => {
            resolve(result);
          };

          const handleError = (error: string) => {
            reject(new Error(error));
          };

          // 临时存储处理器
          (this.worker as any)._tempHandlers = { handleComplete, handleError };
        })
        .catch(reject);
    });
  }

  // 在主线程中导出
  private async exportInMainThread(
    messages: Message[],
    config: ExportConfig,
    chatContainerRef: React.RefObject<HTMLElement>,
    totalFrames: number
  ): Promise<ExportResult> {
    const startTime = Date.now();

    // 捕获帧
    const frames = await this.captureFrames(messages, config, chatContainerRef);

    // 根据格式进行编码
    let blob: Blob;
    let filename: string;

    switch (config.format) {
      case 'gif':
        blob = await this.encodeAsGif(frames, config);
        filename = `wechat-chat-${Date.now()}.gif`;
        break;
      case 'mp4':
        blob = await this.encodeAsVideo(frames, config, 'video/mp4');
        filename = `wechat-chat-${Date.now()}.mp4`;
        break;
      case 'webm':
        blob = await this.encodeAsVideo(frames, config, 'video/webm');
        filename = `wechat-chat-${Date.now()}.webm`;
        break;
      default:
        throw new Error(`不支持的导出格式: ${config.format}`);
    }

    const duration = Date.now() - startTime;

    return {
      blob,
      filename,
      fileSize: blob.size,
      duration,
      config
    };
  }

  // 捕获所有帧
  private async captureFrames(
    messages: Message[],
    config: ExportConfig,
    chatContainerRef: React.RefObject<HTMLElement>
  ): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const container = chatContainerRef.current!;

    // 保存原始样式
    const originalStyle = {
      width: container.style.width,
      height: container.style.height,
      overflow: container.style.overflow
    };

    try {
      // 设置容器尺寸
      container.style.width = `${config.resolution.width}px`;
      container.style.height = `${config.resolution.height}px`;
      container.style.overflow = 'hidden';

      // 逐帧捕获
      for (let i = 0; i <= messages.length; i++) {
        // 更新进度
        if (this.progressCallback) {
          this.progressCallback({
            phase: 'capturing',
            currentFrame: i,
            totalFrames: messages.length + 1,
            percentage: (i / (messages.length + 1)) * 50,
            estimatedTimeRemaining: 0,
            currentFileSize: 0
          });
        }

        // 更新消息显示状态
        const event = new CustomEvent('updateMessageIndex', { detail: i - 1 });
        container.dispatchEvent(event);

        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 100));

        // 捕获当前帧
        const frameData = await this.captureFrame(container, config.resolution);
        frames.push(frameData);
      }

      return frames;
    } finally {
      // 恢复原始样式
      container.style.width = originalStyle.width;
      container.style.height = originalStyle.height;
      container.style.overflow = originalStyle.overflow;
    }
  }

  // 捕获单帧
  private async captureFrame(
    container: HTMLElement,
    resolution: { width: number; height: number }
  ): Promise<ImageData> {
    // 使用OffscreenCanvas进行高效渲染
    const canvas = document.createElement('canvas');
    canvas.width = resolution.width;
    canvas.height = resolution.height;
    const ctx = canvas.getContext('2d')!;

    // 使用html2canvas捕获DOM
    const html2canvas = (await import('html2canvas')).default;
    const sourceCanvas = await html2canvas(container, {
      width: resolution.width,
      height: resolution.height,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f7f7f7'
    });

    // 将捕获的内容绘制到目标canvas
    ctx.drawImage(sourceCanvas, 0, 0, resolution.width, resolution.height);

    return ctx.getImageData(0, 0, resolution.width, resolution.height);
  }

  // 编码为GIF
  private async encodeAsGif(frames: ImageData[], config: ExportConfig): Promise<Blob> {
    const GIF = (await import('gif.js')).default;
    
    return new Promise((resolve, reject) => {
      const gif = new (GIF as any)({
        workers: 2,
        quality: this.getGifQuality(config.quality),
        width: config.resolution.width,
        height: config.resolution.height,
        repeat: 0,
        workerScript: '/gif.worker.js'
      });

      // 监听进度
      gif.on('progress', (progress: number) => {
        if (this.progressCallback) {
          this.progressCallback({
            phase: 'encoding',
            currentFrame: Math.floor(progress * frames.length),
            totalFrames: frames.length,
            percentage: 50 + progress * 50,
            estimatedTimeRemaining: 0,
            currentFileSize: 0
          });
        }
      });

      // 监听完成
      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      // 添加所有帧
      frames.forEach((frameData, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = config.resolution.width;
        canvas.height = config.resolution.height;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(frameData, 0, 0);

        const delay = this.calculateFrameDelay(index, config);
        gif.addFrame(canvas, { delay });
      });

      gif.render();
    });
  }

  // 编码为视频
  private async encodeAsVideo(
    frames: ImageData[],
    config: ExportConfig,
    mimeType: string
  ): Promise<Blob> {
    // 注意：这里需要使用MediaRecorder API或WebCodecs API
    // 由于浏览器兼容性限制，这里提供一个基础实现
    throw new Error('视频导出功能需要更高级的编码库支持');
  }

  // 合并配置与预设
  private mergeConfigWithPreset(config: ExportConfig): ExportConfig {
    if (config.quality !== 'custom' && QUALITY_PRESETS[config.quality]) {
      return {
        ...QUALITY_PRESETS[config.quality],
        ...config
      } as ExportConfig;
    }
    return config;
  }

  // 计算总帧数
  private calculateTotalFrames(messages: Message[], config: ExportConfig): number {
    // 基础帧数：每条消息一帧，加上初始状态
    let totalFrames = messages.length + 1;

    // 根据帧率调整
    if (config.framerate > 15) {
      totalFrames *= Math.ceil(config.framerate / 15);
    }

    return totalFrames;
  }

  // 计算帧延迟
  private calculateFrameDelay(frameIndex: number, config: ExportConfig): number {
    // 基础延迟时间（毫秒）
    const baseDelay = 1000 / config.framerate;
    return Math.max(baseDelay, 100); // 最小100ms
  }

  // 获取GIF质量设置
  private getGifQuality(quality: string): number {
    switch (quality) {
      case 'high': return 1;
      case 'medium': return 10;
      case 'low': return 20;
      default: return 10;
    }
  }

  // 处理导出完成
  private handleExportComplete(result: ExportResult): void {
    if ((this.worker as any)?._tempHandlers?.handleComplete) {
      (this.worker as any)._tempHandlers.handleComplete(result);
      delete (this.worker as any)._tempHandlers;
    }
  }

  // 处理导出错误
  private handleExportError(error: string): void {
    if ((this.worker as any)?._tempHandlers?.handleError) {
      (this.worker as any)._tempHandlers.handleError(error);
      delete (this.worker as any)._tempHandlers;
    }
  }

  // 取消导出
  public cancelExport(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'CANCEL_EXPORT' });
    }
    this.isExporting = false;
    this.progressCallback = null;
  }

  // 销毁引擎
  public destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isExporting = false;
    this.progressCallback = null;
  }
}

// 创建单例导出引擎
export const exportEngine = new ExportEngine();