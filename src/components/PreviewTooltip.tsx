import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatSnapshot, PreviewRenderer, Keyframe } from '../lib/previewRenderer';
import { ChatData } from './ChatInterface';

// 预览提示框属性接口
export interface PreviewTooltipProps {
  // 基础属性
  isVisible: boolean;
  position: { x: number; y: number };
  previewTime: number;
  totalDuration: number;
  
  // 数据属性
  chatData: ChatData;
  previewRenderer: PreviewRenderer | null;
  
  // 回调函数
  onPreviewGenerated?: (snapshot: ChatSnapshot) => void;
  onError?: (error: Error) => void;
}

// 预览信息接口
interface PreviewInfo {
  time: number;
  formattedTime: string;
  messageIndex: number;
  totalMessages: number;
  progress: number;
  keyframe?: Keyframe;
}

// 提示框位置计算结果
interface TooltipPosition {
  x: number;
  y: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * 预览提示组件
 * 在用户悬停时间轴时显示预览缩略图和相关信息
 */
export const PreviewTooltip: React.FC<PreviewTooltipProps> = ({
  isVisible,
  position,
  previewTime,
  totalDuration,
  chatData,
  previewRenderer,
  onPreviewGenerated,
  onError
}) => {
  // 状态管理
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0, arrowPosition: 'bottom' });
  
  // 引用
  const tooltipRef = useRef<HTMLDivElement>(null);
  const thumbnailCacheRef = useRef<Map<number, string>>(new Map());
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 防抖生成预览
  const debouncedGeneratePreview = useCallback(
    debounce(async (time: number) => {
      if (!previewRenderer) return;

      try {
        setIsLoading(true);
        
        // 检查缓存
        const cacheKey = Math.floor(time / 1000); // 按秒缓存
        const cachedThumbnail = thumbnailCacheRef.current.get(cacheKey);
        
        if (cachedThumbnail) {
          setThumbnailUrl(cachedThumbnail);
          setIsLoading(false);
          return;
        }

        // 生成预览快照
        const snapshot = await previewRenderer.generatePreview(time);
        
        // 生成缩略图
        const thumbnail = await previewRenderer.renderThumbnail(snapshot);
        
        // 缓存缩略图
        thumbnailCacheRef.current.set(cacheKey, thumbnail);
        
        // 限制缓存大小
        if (thumbnailCacheRef.current.size > 50) {
          const firstKey = thumbnailCacheRef.current.keys().next().value;
          thumbnailCacheRef.current.delete(firstKey);
        }
        
        setThumbnailUrl(thumbnail);
        onPreviewGenerated?.(snapshot);
        
      } catch (error) {
        console.error('预览生成失败:', error);
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    }, 150),
    [previewRenderer, onPreviewGenerated, onError]
  );

  // 计算预览信息
  const calculatePreviewInfo = useCallback((time: number): PreviewInfo => {
    const messageIndex = calculateMessageIndexFromTime(time, chatData.messages);
    const progress = totalDuration > 0 ? time / totalDuration : 0;
    const keyframe = previewRenderer?.getNearestKeyframe(time) || undefined;
    
    return {
      time,
      formattedTime: formatTime(time),
      messageIndex,
      totalMessages: chatData.messages.length,
      progress: Math.round(progress * 100),
      keyframe
    };
  }, [totalDuration, chatData.messages, previewRenderer]);

  // 计算提示框位置
  const calculateTooltipPosition = useCallback((mousePos: { x: number; y: number }): TooltipPosition => {
    if (!tooltipRef.current) {
      return { x: mousePos.x, y: mousePos.y - 10, arrowPosition: 'bottom' };
    }

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const tooltipWidth = 280; // 预设宽度
    const tooltipHeight = 200; // 预设高度
    const margin = 10;
    
    let x = mousePos.x - tooltipWidth / 2;
    let y = mousePos.y - tooltipHeight - margin;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    
    // 水平位置调整
    if (x < margin) {
      x = margin;
    } else if (x + tooltipWidth > viewportWidth - margin) {
      x = viewportWidth - tooltipWidth - margin;
    }
    
    // 垂直位置调整
    if (y < margin) {
      // 如果上方空间不足，显示在下方
      y = mousePos.y + margin;
      arrowPosition = 'top';
    }
    
    // 如果下方也不足，尝试左右显示
    if (y + tooltipHeight > viewportHeight - margin && arrowPosition === 'top') {
      if (mousePos.x > viewportWidth / 2) {
        // 显示在左侧
        x = mousePos.x - tooltipWidth - margin;
        y = mousePos.y - tooltipHeight / 2;
        arrowPosition = 'right';
      } else {
        // 显示在右侧
        x = mousePos.x + margin;
        y = mousePos.y - tooltipHeight / 2;
        arrowPosition = 'left';
      }
    }
    
    return { x, y, arrowPosition };
  }, []);

  // 更新预览信息
  useEffect(() => {
    if (isVisible) {
      const info = calculatePreviewInfo(previewTime);
      setPreviewInfo(info);
      
      // 设置加载超时
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(true);
      }, 100);
      
      debouncedGeneratePreview(previewTime);
    } else {
      setThumbnailUrl(null);
      setPreviewInfo(null);
      setIsLoading(false);
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [isVisible, previewTime, calculatePreviewInfo, debouncedGeneratePreview]);

  // 更新提示框位置
  useEffect(() => {
    if (isVisible) {
      const newPosition = calculateTooltipPosition(position);
      setTooltipPosition(newPosition);
    }
  }, [isVisible, position, calculateTooltipPosition]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      // 清理缓存
      thumbnailCacheRef.current.clear();
    };
  }, []);

  // 如果不可见，不渲染
  if (!isVisible || !previewInfo) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className={`fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        width: '280px',
        maxHeight: '200px'
      }}
    >
      {/* 箭头指示器 */}
      <div
        className={`absolute w-2 h-2 bg-white border transform rotate-45 ${
          tooltipPosition.arrowPosition === 'bottom' ? '-bottom-1 left-1/2 -translate-x-1/2 border-r-0 border-b-0' :
          tooltipPosition.arrowPosition === 'top' ? '-top-1 left-1/2 -translate-x-1/2 border-l-0 border-t-0' :
          tooltipPosition.arrowPosition === 'left' ? '-left-1 top-1/2 -translate-y-1/2 border-l-0 border-b-0' :
          '-right-1 top-1/2 -translate-y-1/2 border-r-0 border-t-0'
        }`}
      />
      
      {/* 预览缩略图区域 */}
      <div className="mb-3">
        <div className="w-full h-24 bg-gray-100 rounded-md overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="预览缩略图"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              预览不可用
            </div>
          )}
          
          {/* 播放进度指示器 */}
          <div className="absolute bottom-1 left-1 right-1 h-1 bg-black bg-opacity-20 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${previewInfo.progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* 预览信息面板 */}
      <div className="space-y-2 text-sm">
        {/* 时间信息 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">时间:</span>
          <span className="font-mono text-blue-600">{previewInfo.formattedTime}</span>
        </div>
        
        {/* 消息索引信息 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">消息:</span>
          <span className="text-gray-800">
            {previewInfo.messageIndex + 1} / {previewInfo.totalMessages}
          </span>
        </div>
        
        {/* 进度信息 */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">进度:</span>
          <span className="text-gray-800">{previewInfo.progress}%</span>
        </div>
        
        {/* 关键帧信息 */}
        {previewInfo.keyframe && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getKeyframeColor(previewInfo.keyframe.type)}`} />
              <span className="text-xs text-gray-600 truncate">
                {previewInfo.keyframe.title}
              </span>
            </div>
          </div>
        )}
        
        {/* 当前消息内容预览 */}
        {previewInfo.messageIndex >= 0 && previewInfo.messageIndex < chatData.messages.length && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">当前消息:</div>
            <div className="text-xs text-gray-700 truncate">
              {getCurrentMessagePreview(chatData.messages[previewInfo.messageIndex])}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 工具函数

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * 格式化时间显示
 */
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * 根据时间计算消息索引
 */
function calculateMessageIndexFromTime(time: number, messages: any[]): number {
  // 这里应该使用与PlaybackStateManager相同的逻辑
  // 为了简化，这里使用线性估算
  const averageMessageDuration = 2000; // 2秒
  const estimatedIndex = Math.floor(time / averageMessageDuration);
  return Math.max(0, Math.min(estimatedIndex, messages.length - 1));
}

/**
 * 获取关键帧类型对应的颜色
 */
function getKeyframeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'message': 'bg-blue-500',
    'voice': 'bg-green-500',
    'image': 'bg-purple-500',
    'location': 'bg-orange-500',
    'recall': 'bg-red-500',
    'typing': 'bg-gray-500',
    'pause': 'bg-yellow-500'
  };
  
  return colorMap[type] || 'bg-gray-400';
}

/**
 * 获取当前消息的预览文本
 */
function getCurrentMessagePreview(message: any): string {
  if (!message) return '';
  
  switch (message.type) {
    case 'voice':
      return `🎤 语音消息 (${message.voiceDuration || '未知时长'})`;
    case 'image':
      return '📷 图片消息';
    case 'location':
      return '📍 位置分享';
    case 'recall':
      return '↩️ 撤回了一条消息';
    case 'typing':
      return '⌨️ 正在输入...';
    case 'pause':
      return `⏸️ 暂停 - ${message.description || ''}`;
    default:
      const content = message.content || '';
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
  }
}

export default PreviewTooltip;