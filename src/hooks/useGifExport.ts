import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import GIF from 'gif.js';
import { Message } from '../components/ChatInterface';

export interface ExportOptions {
  width?: number;
  height?: number;
  quality?: number;
  delay?: number;
  repeat?: number;
}

export interface ExportState {
  isExporting: boolean;
  progress: number;
  error: string | null;
}

export function useGifExport() {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    error: null
  });

  const exportToGif = useCallback(async (
    chatContainerRef: React.RefObject<HTMLElement>,
    messages: Message[],
    options: ExportOptions = {}
  ) => {
    if (!chatContainerRef.current || messages.length === 0) {
      setExportState(prev => ({ ...prev, error: '无法获取聊天容器或消息为空' }));
      return;
    }

    const {
      width = 375,
      height = 667,
      quality = 10,
      delay = 1500,
      repeat = 0
    } = options;

    setExportState({
      isExporting: true,
      progress: 0,
      error: null
    });

    try {
      // 创建GIF实例
      const gif = new GIF({
        workers: 2,
        quality,
        width,
        height,
        repeat
      });

      // 监听GIF生成进度
      gif.on('progress', (progress: number) => {
        setExportState(prev => ({
          ...prev,
          progress: Math.round(progress * 100)
        }));
      });

      // 监听GIF生成完成
      gif.on('finished', (blob: Blob) => {
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wechat-chat-${Date.now()}.gif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportState({
          isExporting: false,
          progress: 100,
          error: null
        });
      });

      // 获取聊天容器的原始样式
      const container = chatContainerRef.current;
      const originalStyle = {
        width: container.style.width,
        height: container.style.height,
        overflow: container.style.overflow
      };

      // 设置容器为固定尺寸
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.overflow = 'hidden';

      // 计算每条消息的延迟时间
      const getMessageDelay = (message: Message): number => {
        if (message.type === 'pause') {
          const duration = message.duration || '1秒';
          const match = duration.match(/(\d+)(秒|分钟)/);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            return unit === '分钟' ? value * 1000 : value * 200; // 缩短实际时间
          }
        } else if (message.type === 'typing') {
          return 800; // 打字状态显示800ms
        }
        return delay;
      };

      // 逐步渲染每个消息状态
      for (let i = 0; i <= messages.length; i++) {
        // 更新DOM以显示到第i条消息
        const event = new CustomEvent('updateMessageIndex', { detail: i - 1 });
        container.dispatchEvent(event);

        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 100));

        // 截取当前状态
        const canvas = await html2canvas(container, {
          width,
          height,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#f7f7f7'
        });

        // 计算当前帧的延迟时间
        const frameDelay = i < messages.length ? getMessageDelay(messages[i]) : delay;

        // 添加帧到GIF
        gif.addFrame(canvas, { delay: frameDelay });

        // 更新进度（截图阶段占50%）
        setExportState(prev => ({
          ...prev,
          progress: Math.round((i / messages.length) * 50)
        }));
      }

      // 恢复容器原始样式
      container.style.width = originalStyle.width;
      container.style.height = originalStyle.height;
      container.style.overflow = originalStyle.overflow;

      // 开始渲染GIF
      gif.render();

    } catch (error) {
      console.error('GIF export failed:', error);
      setExportState({
        isExporting: false,
        progress: 0,
        error: error instanceof Error ? error.message : '导出失败'
      });
    }
  }, []);

  const exportToVideo = useCallback(async (
    chatContainerRef: React.RefObject<HTMLElement>,
    messages: Message[],
    options: ExportOptions = {}
  ) => {
    // 视频导出功能（可选实现）
    console.log('Video export not implemented yet');
    setExportState(prev => ({ ...prev, error: '视频导出功能暂未实现' }));
  }, []);

  const resetExportState = useCallback(() => {
    setExportState({
      isExporting: false,
      progress: 0,
      error: null
    });
  }, []);

  return {
    exportState,
    exportToGif,
    exportToVideo,
    resetExportState
  };
}