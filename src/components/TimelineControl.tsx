import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Message } from './ChatInterface';

// 关键帧接口
export interface Keyframe {
  id: string;
  time: number;
  messageIndex: number;
  type: 'message' | 'typing' | 'voice' | 'image' | 'recall' | 'pause' | 'location';
  title: string;
  thumbnail?: string;
  color: string;
}

// 时间轴控制器属性接口
export interface TimelineControlProps {
  // 基础属性
  totalDuration: number;
  currentTime: number;
  keyframes: Keyframe[];
  isPlaying: boolean;
  
  // 事件回调
  onSeek: (time: number) => void;
  onPreview: (time: number) => void;
  onKeyframeClick: (keyframe: Keyframe) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  
  // 可选配置
  className?: string;
  disabled?: boolean;
  showKeyframes?: boolean;
  showPreview?: boolean;
  height?: number;
}

// 预览信息接口
interface PreviewInfo {
  time: number;
  messageIndex: number;
  position: { x: number; y: number };
  visible: boolean;
}

/**
 * 关键帧标记组件
 */
const KeyframeMarker: React.FC<{
  keyframe: Keyframe;
  position: number;
  onClick: () => void;
  isActive: boolean;
}> = ({ keyframe, position, onClick, isActive }) => {
  const getIcon = () => {
    switch (keyframe.type) {
      case 'voice':
        return '🎵';
      case 'image':
        return '🖼️';
      case 'location':
        return '📍';
      case 'recall':
        return '↩️';
      case 'typing':
        return '⌨️';
      case 'pause':
        return '⏸️';
      default:
        return '💬';
    }
  };

  return (
    <div
      className={`absolute top-0 transform -translate-x-1/2 cursor-pointer transition-all duration-200 ${
        isActive ? 'scale-125 z-20' : 'hover:scale-110 z-10'
      }`}
      style={{ left: `${position * 100}%` }}
      onClick={onClick}
      title={keyframe.title}
    >
      <div
        className={`w-3 h-3 rounded-full border-2 border-white shadow-md flex items-center justify-center text-xs ${
          isActive ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{ backgroundColor: keyframe.color }}
      >
        <span className="text-white text-[8px]">{getIcon()}</span>
      </div>
    </div>
  );
};

/**
 * 预览提示框组件
 */
const PreviewTooltip: React.FC<{
  previewInfo: PreviewInfo;
  keyframe?: Keyframe;
}> = ({ previewInfo, keyframe }) => {
  if (!previewInfo.visible) return null;

  const formatTime = (time: number) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="absolute z-30 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
      style={{
        left: previewInfo.position.x,
        top: previewInfo.position.y - 8
      }}
    >
      <div className="flex flex-col space-y-1">
        <div className="font-medium">{formatTime(previewInfo.time)}</div>
        <div className="text-gray-300">消息 #{previewInfo.messageIndex + 1}</div>
        {keyframe && (
          <div className="text-blue-300 border-t border-gray-600 pt-1">
            {keyframe.title}
          </div>
        )}
      </div>
      {/* 箭头 */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
    </div>
  );
};

/**
 * 交互式时间轴控制器组件
 * 提供可拖拽的进度条、关键帧标记、悬停预览等功能
 */
export const TimelineControl: React.FC<TimelineControlProps> = ({
  totalDuration,
  currentTime,
  keyframes,
  isPlaying,
  onSeek,
  onPreview,
  onKeyframeClick,
  onDragStart,
  onDragEnd,
  className = '',
  disabled = false,
  showKeyframes = true,
  showPreview = true,
  height = 40
}) => {
  // 状态管理
  const [isDragging, setIsDragging] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo>({
    time: 0,
    messageIndex: 0,
    position: { x: 0, y: 0 },
    visible: false
  });
  const [activeKeyframe, setActiveKeyframe] = useState<Keyframe | null>(null);

  // DOM 引用
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // 计算当前进度
  const progress = useMemo(() => {
    return totalDuration > 0 ? Math.max(0, Math.min(1, currentTime / totalDuration)) : 0;
  }, [currentTime, totalDuration]);

  // 计算像素位置对应的时间和消息索引
  const calculateTimeFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    
    const rect = trackRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, relativeX / rect.width));
    
    return progress * totalDuration;
  }, [totalDuration]);

  // 计算消息索引（简化版本，实际应该从 timelineCalculator 获取）
  const calculateMessageIndexFromTime = useCallback((time: number): number => {
    // 这里是简化的计算逻辑，实际应该使用 timelineCalculator
    const progress = totalDuration > 0 ? time / totalDuration : 0;
    return Math.floor(progress * keyframes.length);
  }, [totalDuration, keyframes.length]);

  // 查找当前时间点的关键帧
  const findKeyframeAtTime = useCallback((time: number): Keyframe | undefined => {
    return keyframes.find(keyframe => Math.abs(keyframe.time - time) < 500); // 500ms 容差
  }, [keyframes]);

  // 鼠标按下事件处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    
    const time = calculateTimeFromPosition(event.clientX);
    onSeek(time);
    onDragStart?.();
    
    // 添加全局鼠标事件监听
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const time = calculateTimeFromPosition(e.clientX);
      onSeek(time);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      onDragEnd?.();
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, calculateTimeFromPosition, onSeek, onDragStart, onDragEnd]);

  // 鼠标悬停事件处理
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (disabled || !showPreview || isDragging) return;
    
    const time = calculateTimeFromPosition(event.clientX);
    const messageIndex = calculateMessageIndexFromTime(time);
    const keyframe = findKeyframeAtTime(time);
    
    setPreviewInfo({
      time,
      messageIndex,
      position: { x: event.clientX, y: event.clientY },
      visible: true
    });
    
    setActiveKeyframe(keyframe || null);
    onPreview(time);
  }, [disabled, showPreview, isDragging, calculateTimeFromPosition, calculateMessageIndexFromTime, findKeyframeAtTime, onPreview]);

  // 鼠标离开事件处理
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setPreviewInfo(prev => ({ ...prev, visible: false }));
      setActiveKeyframe(null);
    }
  }, [isDragging]);

  // 关键帧点击处理
  const handleKeyframeClick = useCallback((keyframe: Keyframe) => {
    if (disabled) return;
    onKeyframeClick(keyframe);
    onSeek(keyframe.time);
  }, [disabled, onKeyframeClick, onSeek]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      
      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault();
          const prevTime = Math.max(0, currentTime - 1000); // 向前1秒
          onSeek(prevTime);
          break;
        case 'ArrowRight':
          event.preventDefault();
          const nextTime = Math.min(totalDuration, currentTime + 1000); // 向后1秒
          onSeek(nextTime);
          break;
        case 'Home':
          event.preventDefault();
          onSeek(0);
          break;
        case 'End':
          event.preventDefault();
          onSeek(totalDuration);
          break;
      }
    };
    
    // 只有当组件获得焦点时才监听键盘事件
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, currentTime, totalDuration, onSeek]);

  // 格式化时间显示
  const formatTime = (time: number) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`timeline-control ${className}`} style={{ height }}>
      {/* 时间显示 */}
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(totalDuration)}</span>
      </div>
      
      {/* 时间轴轨道 */}
      <div className="relative">
        <div
          ref={trackRef}
          className={`relative w-full bg-gray-200 rounded-full cursor-pointer transition-all duration-200 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'
          }`}
          style={{ height: '8px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* 进度条背景 */}
          <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
          
          {/* 已播放进度 */}
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-200 ${
              isPlaying ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          ></div>
          
          {/* 缓冲区指示器（可选） */}
          <div
            className="absolute left-0 top-0 h-full bg-gray-400 opacity-30 rounded-full"
            style={{ width: `${Math.min(100, (progress + 0.1) * 100)}%` }}
          ></div>
          
          {/* 关键帧标记 */}
          {showKeyframes && keyframes.map((keyframe) => (
            <KeyframeMarker
              key={keyframe.id}
              keyframe={keyframe}
              position={totalDuration > 0 ? keyframe.time / totalDuration : 0}
              onClick={() => handleKeyframeClick(keyframe)}
              isActive={activeKeyframe?.id === keyframe.id}
            />
          ))}
          
          {/* 播放头 */}
          <div
            className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-200 ${
              isDragging ? 'scale-125 bg-blue-600' : isPlaying ? 'bg-green-500' : 'bg-blue-500'
            } ${disabled ? 'opacity-50' : 'hover:scale-110'}`}
            style={{ left: `${progress * 100}%` }}
          >
            {/* 播放头中心点 */}
            <div className="absolute inset-1 bg-white rounded-full opacity-80"></div>
          </div>
        </div>
        
        {/* 预览提示框 */}
        <PreviewTooltip
          previewInfo={previewInfo}
          keyframe={activeKeyframe || undefined}
        />
      </div>
      
      {/* 状态指示器 */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          <span>{isPlaying ? '播放中' : '已暂停'}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {showKeyframes && (
            <span>{keyframes.length} 个关键帧</span>
          )}
          <span>进度: {Math.round(progress * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineControl;