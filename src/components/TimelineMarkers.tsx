import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Message } from './ChatInterface';
import { Keyframe } from './TimelineControl';

// 时间轴标记类型
export type MarkerType = 'message' | 'typing' | 'voice' | 'image' | 'recall' | 'pause' | 'location' | 'chapter' | 'bookmark';

// 时间轴标记接口
export interface TimelineMarker {
  id: string;
  time: number;
  messageIndex: number;
  type: MarkerType;
  title: string;
  description?: string;
  color: string;
  icon: string;
  duration?: number;
  metadata?: {
    speaker?: string;
    content?: string;
    voiceDuration?: string;
    imageCount?: number;
  };
}

// 缩放级别
export type ZoomLevel = 'overview' | 'normal' | 'detailed' | 'precise';

// 时间轴标记系统属性
export interface TimelineMarkersProps {
  // 基础数据
  messages: Message[];
  totalDuration: number;
  currentTime: number;
  keyframes: Keyframe[];
  
  // 显示配置
  zoomLevel: ZoomLevel;
  showLabels: boolean;
  showDurations: boolean;
  groupSimilarMarkers: boolean;
  
  // 交互回调
  onMarkerClick: (marker: TimelineMarker) => void;
  onMarkerHover: (marker: TimelineMarker | null) => void;
  onZoomChange: (level: ZoomLevel) => void;
  onNavigateToMarker: (markerId: string) => void;
  
  // 样式配置
  height?: number;
  className?: string;
}

// 标记信息提示框
interface MarkerTooltip {
  marker: TimelineMarker;
  position: { x: number; y: number };
  visible: boolean;
}

/**
 * 获取消息类型对应的标记配置
 */
const getMarkerConfig = (message: Message, messageIndex: number): Omit<TimelineMarker, 'id' | 'time'> => {
  const configs = {
    message: {
      color: '#3B82F6',
      icon: '💬',
      title: `消息 #${messageIndex + 1}`,
      description: message.content ? `${message.content.substring(0, 30)}...` : '文本消息'
    },
    typing: {
      color: '#10B981',
      icon: '⌨️',
      title: '输入中',
      description: `${message.speaker} 正在输入...`
    },
    voice: {
      color: '#F59E0B',
      icon: '🎵',
      title: '语音消息',
      description: `时长: ${message.voiceDuration || '未知'}`
    },
    image: {
      color: '#8B5CF6',
      icon: '🖼️',
      title: '图片消息',
      description: message.imageDescription || '图片内容'
    },
    location: {
      color: '#EF4444',
      icon: '📍',
      title: '位置分享',
      description: message.description || '位置信息'
    },
    recall: {
      color: '#6B7280',
      icon: '↩️',
      title: '消息撤回',
      description: `撤回: ${message.originalMessage || '消息'}`
    },
    pause: {
      color: '#9CA3AF',
      icon: '⏸️',
      title: '暂停',
      description: `暂停 ${message.duration || '1秒'}`
    }
  };

  const type = message.type || 'message';
  const config = configs[type as keyof typeof configs] || configs.message;
  
  return {
    messageIndex,
    type: type as MarkerType,
    ...config,
    metadata: {
      speaker: message.speaker,
      content: message.content,
      voiceDuration: message.voiceDuration,
      imageCount: Array.isArray(message.imageUrl) ? message.imageUrl.length : (message.imageUrl ? 1 : 0)
    }
  };
};

/**
 * 单个标记组件
 */
const MarkerItem: React.FC<{
  marker: TimelineMarker;
  position: number;
  zoomLevel: ZoomLevel;
  showLabels: boolean;
  isActive: boolean;
  onClick: () => void;
  onHover: (hover: boolean) => void;
}> = ({ marker, position, zoomLevel, showLabels, isActive, onClick, onHover }) => {
  const getMarkerSize = () => {
    switch (zoomLevel) {
      case 'overview': return 'w-2 h-2';
      case 'normal': return 'w-3 h-3';
      case 'detailed': return 'w-4 h-4';
      case 'precise': return 'w-5 h-5';
      default: return 'w-3 h-3';
    }
  };

  const getIconSize = () => {
    switch (zoomLevel) {
      case 'overview': return 'text-[6px]';
      case 'normal': return 'text-[8px]';
      case 'detailed': return 'text-[10px]';
      case 'precise': return 'text-xs';
      default: return 'text-[8px]';
    }
  };

  const shouldShowLabel = showLabels && (zoomLevel === 'detailed' || zoomLevel === 'precise');

  return (
    <div
      className={`absolute transform -translate-x-1/2 cursor-pointer transition-all duration-200 ${
        isActive ? 'scale-125 z-20' : 'hover:scale-110 z-10'
      }`}
      style={{ left: `${position * 100}%`, top: '0' }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* 标记点 */}
      <div
        className={`${getMarkerSize()} rounded-full border-2 border-white shadow-md flex items-center justify-center ${
          isActive ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{ backgroundColor: marker.color }}
        title={marker.title}
      >
        <span className={`text-white ${getIconSize()}`}>{marker.icon}</span>
      </div>
      
      {/* 标记标签 */}
      {shouldShowLabel && (
        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg">
            {marker.title}
          </div>
        </div>
      )}
      
      {/* 持续时间指示器 */}
      {marker.duration && zoomLevel === 'precise' && (
        <div
          className="absolute top-0 h-1 bg-current opacity-30 rounded"
          style={{
            left: '50%',
            width: `${(marker.duration / 1000) * 20}px`, // 简化的宽度计算
            backgroundColor: marker.color
          }}
        />
      )}
    </div>
  );
};

/**
 * 标记提示框组件
 */
const MarkerTooltipComponent: React.FC<{
  tooltip: MarkerTooltip;
}> = ({ tooltip }) => {
  if (!tooltip.visible) return null;

  const { marker } = tooltip;

  return (
    <div
      className="absolute z-30 bg-gray-900 text-white text-sm rounded-lg px-4 py-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full max-w-xs"
      style={{
        left: tooltip.position.x,
        top: tooltip.position.y - 12
      }}
    >
      <div className="space-y-2">
        {/* 标题 */}
        <div className="flex items-center space-x-2">
          <span className="text-lg">{marker.icon}</span>
          <span className="font-semibold">{marker.title}</span>
        </div>
        
        {/* 描述 */}
        {marker.description && (
          <div className="text-gray-300 text-xs">
            {marker.description}
          </div>
        )}
        
        {/* 元数据 */}
        {marker.metadata && (
          <div className="text-gray-400 text-xs space-y-1 border-t border-gray-700 pt-2">
            {marker.metadata.speaker && (
              <div>发言人: {marker.metadata.speaker}</div>
            )}
            {marker.metadata.voiceDuration && (
              <div>语音时长: {marker.metadata.voiceDuration}</div>
            )}
            {marker.metadata.imageCount && marker.metadata.imageCount > 0 && (
              <div>图片数量: {marker.metadata.imageCount}</div>
            )}
          </div>
        )}
        
        {/* 时间信息 */}
        <div className="text-gray-400 text-xs border-t border-gray-700 pt-2">
          消息索引: #{marker.messageIndex + 1}
        </div>
      </div>
      
      {/* 箭头 */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  );
};

/**
 * 缩放控制组件
 */
const ZoomControls: React.FC<{
  currentZoom: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
}> = ({ currentZoom, onZoomChange }) => {
  const zoomLevels: { level: ZoomLevel; label: string; icon: string }[] = [
    { level: 'overview', label: '总览', icon: '🔍-' },
    { level: 'normal', label: '正常', icon: '🔍' },
    { level: 'detailed', label: '详细', icon: '🔍+' },
    { level: 'precise', label: '精确', icon: '🔍++' }
  ];

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      {zoomLevels.map(({ level, label, icon }) => (
        <button
          key={level}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            currentZoom === level
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => onZoomChange(level)}
          title={`${label}视图`}
        >
          <span className="mr-1">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
};

/**
 * 导航控制组件
 */
const NavigationControls: React.FC<{
  markers: TimelineMarker[];
  currentTime: number;
  onNavigateToMarker: (markerId: string) => void;
}> = ({ markers, currentTime, onNavigateToMarker }) => {
  const currentMarkerIndex = useMemo(() => {
    return markers.findIndex(marker => marker.time >= currentTime);
  }, [markers, currentTime]);

  const handlePrevious = () => {
    const prevIndex = Math.max(0, currentMarkerIndex - 1);
    if (markers[prevIndex]) {
      onNavigateToMarker(markers[prevIndex].id);
    }
  };

  const handleNext = () => {
    const nextIndex = Math.min(markers.length - 1, currentMarkerIndex + 1);
    if (markers[nextIndex]) {
      onNavigateToMarker(markers[nextIndex].id);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-50"
        onClick={handlePrevious}
        disabled={currentMarkerIndex <= 0}
        title="上一个标记"
      >
        ⏮️
      </button>
      <span className="text-xs text-gray-500">
        {currentMarkerIndex + 1} / {markers.length}
      </span>
      <button
        className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-50"
        onClick={handleNext}
        disabled={currentMarkerIndex >= markers.length - 1}
        title="下一个标记"
      >
        ⏭️
      </button>
    </div>
  );
};

/**
 * 时间轴标记系统主组件
 */
export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  messages,
  totalDuration,
  currentTime,
  keyframes,
  zoomLevel,
  showLabels,
  showDurations,
  groupSimilarMarkers,
  onMarkerClick,
  onMarkerHover,
  onZoomChange,
  onNavigateToMarker,
  height = 60,
  className = ''
}) => {
  // 状态管理
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [tooltip, setTooltip] = useState<MarkerTooltip>({
    marker: {} as TimelineMarker,
    position: { x: 0, y: 0 },
    visible: false
  });

  // DOM 引用
  const containerRef = useRef<HTMLDivElement>(null);

  // 生成时间轴标记
  const markers = useMemo(() => {
    const generatedMarkers: TimelineMarker[] = [];
    
    messages.forEach((message, index) => {
      // 计算消息时间（简化版本，实际应该使用 timelineCalculator）
      const messageTime = (index / messages.length) * totalDuration;
      
      const markerConfig = getMarkerConfig(message, index);
      const marker: TimelineMarker = {
        id: `marker-${index}`,
        time: messageTime,
        duration: message.duration ? parseInt(message.duration) * 1000 : undefined,
        ...markerConfig
      };
      
      generatedMarkers.push(marker);
    });
    
    return generatedMarkers;
  }, [messages, totalDuration]);

  // 处理标记悬停
  const handleMarkerHover = useCallback((marker: TimelineMarker, hover: boolean, event?: React.MouseEvent) => {
    if (hover && event) {
      setHoveredMarker(marker);
      setTooltip({
        marker,
        position: { x: event.clientX, y: event.clientY },
        visible: true
      });
      onMarkerHover(marker);
    } else {
      setHoveredMarker(null);
      setTooltip(prev => ({ ...prev, visible: false }));
      onMarkerHover(null);
    }
  }, [onMarkerHover]);

  // 处理标记点击
  const handleMarkerClick = useCallback((marker: TimelineMarker) => {
    onMarkerClick(marker);
  }, [onMarkerClick]);

  // 处理导航到标记
  const handleNavigateToMarker = useCallback((markerId: string) => {
    onNavigateToMarker(markerId);
  }, [onNavigateToMarker]);

  // 获取当前活跃的标记
  const activeMarker = useMemo(() => {
    return markers.find(marker => Math.abs(marker.time - currentTime) < 500);
  }, [markers, currentTime]);

  return (
    <div className={`timeline-markers ${className}`} style={{ height }}>
      {/* 控制面板 */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-4">
          {/* 缩放控制 */}
          <ZoomControls
            currentZoom={zoomLevel}
            onZoomChange={onZoomChange}
          />
          
          {/* 显示选项 */}
          <div className="flex items-center space-x-2 text-xs">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => {
                  // 这里应该通过 props 回调来更新父组件状态
                  // 暂时忽略，因为这是演示代码
                }}
                className="w-3 h-3"
              />
              <span>显示标签</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={showDurations}
                onChange={(e) => {
                  // 同上
                }}
                className="w-3 h-3"
              />
              <span>显示时长</span>
            </label>
          </div>
        </div>
        
        {/* 导航控制 */}
        <NavigationControls
          markers={markers}
          currentTime={currentTime}
          onNavigateToMarker={handleNavigateToMarker}
        />
      </div>
      
      {/* 标记轨道 */}
      <div
        ref={containerRef}
        className="relative w-full bg-gray-100 rounded-lg"
        style={{ height: height - 40 }}
      >
        {/* 背景网格（精确模式下显示） */}
        {zoomLevel === 'precise' && (
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-gray-300"
                style={{ left: `${(i + 1) * 10}%` }}
              />
            ))}
          </div>
        )}
        
        {/* 当前时间指示线 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
        />
        
        {/* 标记点 */}
        {markers.map((marker) => (
          <MarkerItem
            key={marker.id}
            marker={marker}
            position={totalDuration > 0 ? marker.time / totalDuration : 0}
            zoomLevel={zoomLevel}
            showLabels={showLabels}
            isActive={activeMarker?.id === marker.id}
            onClick={() => handleMarkerClick(marker)}
            onHover={(hover) => handleMarkerHover(marker, hover)}
          />
        ))}
      </div>
      
      {/* 提示框 */}
      <MarkerTooltipComponent tooltip={tooltip} />
      
      {/* 统计信息 */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <div>
          共 {markers.length} 个标记
        </div>
        <div>
          当前: {activeMarker ? activeMarker.title : '无'}
        </div>
      </div>
    </div>
  );
};

export default TimelineMarkers;