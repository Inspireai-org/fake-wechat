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

// 时间轴编辑配置接口
export interface TimelineEditConfig {
  format: 'json' | 'yaml' | 'csv';
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeKeyframes: boolean;
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
  
  // 编辑功能回调
  onKeyframeDrag?: (keyframeId: string, newTime: number) => void;
  onKeyframeDurationChange?: (keyframeId: string, newDuration: number) => void;
  onTimelineExport?: (config: TimelineEditConfig) => void;
  onTimelineSave?: (data: any) => void;
  onTimelineLoad?: (data: any) => void;
  
  // 可选配置
  className?: string;
  disabled?: boolean;
  showKeyframes?: boolean;
  showPreview?: boolean;
  height?: number;
  editMode?: boolean;
  allowKeyframeDrag?: boolean;
  allowDurationEdit?: boolean;
}

// 预览信息接口
interface PreviewInfo {
  time: number;
  messageIndex: number;
  position: { x: number; y: number };
  visible: boolean;
}

/**
 * 关键帧标记组件（增强版，支持编辑）
 */
const KeyframeMarker: React.FC<{
  keyframe: Keyframe;
  position: number;
  onClick: () => void;
  isActive: boolean;
  editMode?: boolean;
  allowDrag?: boolean;
  onDrag?: (keyframeId: string, newTime: number) => void;
  onDurationChange?: (keyframeId: string, newDuration: number) => void;
  totalDuration: number;
}> = ({ 
  keyframe, 
  position, 
  onClick, 
  isActive, 
  editMode = false,
  allowDrag = false,
  onDrag,
  onDurationChange,
  totalDuration
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showDurationEditor, setShowDurationEditor] = useState(false);
  const [tempDuration, setTempDuration] = useState(keyframe.time.toString());

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

  // 处理关键帧拖拽
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!editMode || !allowDrag || !onDrag) {
      onClick();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      const container = (event.target as HTMLElement).closest('.timeline-control');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, relativeX / rect.width));
      const newTime = progress * totalDuration;
      
      onDrag(keyframe.id, newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [editMode, allowDrag, onDrag, onClick, keyframe.id, totalDuration]);

  // 处理时长编辑
  const handleDurationEdit = useCallback(() => {
    if (!editMode || !onDurationChange) return;
    setShowDurationEditor(true);
  }, [editMode, onDurationChange]);

  const handleDurationSave = useCallback(() => {
    if (!onDurationChange) return;
    const newDuration = parseFloat(tempDuration);
    if (!isNaN(newDuration) && newDuration > 0) {
      onDurationChange(keyframe.id, newDuration);
    }
    setShowDurationEditor(false);
  }, [onDurationChange, keyframe.id, tempDuration]);

  const handleDurationCancel = useCallback(() => {
    setTempDuration(keyframe.time.toString());
    setShowDurationEditor(false);
  }, [keyframe.time]);

  return (
    <div
      className={`absolute top-0 transform -translate-x-1/2 transition-all duration-200 ${
        editMode && allowDrag ? 'cursor-move' : 'cursor-pointer'
      } ${
        isActive ? 'scale-125 z-20' : 'hover:scale-110 z-10'
      } ${
        isDragging ? 'scale-150 z-30' : ''
      }`}
      style={{ left: `${position * 100}%` }}
      onMouseDown={handleMouseDown}
      title={editMode ? `${keyframe.title} (可编辑)` : keyframe.title}
    >
      <div
        className={`w-3 h-3 rounded-full border-2 border-white shadow-md flex items-center justify-center text-xs ${
          isActive ? 'ring-2 ring-blue-400' : ''
        } ${
          isDragging ? 'ring-2 ring-green-400' : ''
        } ${
          editMode ? 'border-yellow-400' : ''
        }`}
        style={{ backgroundColor: keyframe.color }}
      >
        <span className="text-white text-[8px]">{getIcon()}</span>
      </div>

      {/* 编辑模式下的额外控制 */}
      {editMode && isActive && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-32">
          <div className="text-xs space-y-2">
            <div className="font-medium text-gray-700">{keyframe.title}</div>
            
            {/* 时长编辑 */}
            {onDurationChange && (
              <div>
                <label className="block text-gray-600 mb-1">时长 (ms):</label>
                {showDurationEditor ? (
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      value={tempDuration}
                      onChange={(e) => setTempDuration(e.target.value)}
                      className="w-16 px-1 py-0.5 text-xs border rounded"
                      min="0"
                      step="100"
                    />
                    <button
                      onClick={handleDurationSave}
                      className="px-1 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleDurationCancel}
                      className="px-1 py-0.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={handleDurationEdit}
                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                  >
                    {keyframe.time}ms (点击编辑)
                  </div>
                )}
              </div>
            )}
            
            {/* 位置信息 */}
            <div className="text-gray-500">
              位置: {Math.round(position * 100)}%
            </div>
          </div>
        </div>
      )}
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
 * 时间轴导出对话框组件
 */
const TimelineExportDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: TimelineEditConfig) => void;
  keyframes: Keyframe[];
  totalDuration: number;
}> = ({ isOpen, onClose, onExport, keyframes, totalDuration }) => {
  const [config, setConfig] = useState<TimelineEditConfig>({
    format: 'json',
    includeMetadata: true,
    includeTimestamps: true,
    includeKeyframes: true
  });

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(config);
    onClose();
  };

  const formatTime = (time: number) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">导出时间轴配置</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 导出格式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出格式
            </label>
            <select
              value={config.format}
              onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as unknown }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          {/* 包含选项 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              包含内容
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeMetadata}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">元数据信息</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeTimestamps}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">时间戳</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeKeyframes}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeKeyframes: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">关键帧信息</span>
              </label>
            </div>
          </div>

          {/* 预览信息 */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">预览信息</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>总时长: {formatTime(totalDuration)}</div>
              <div>关键帧数量: {keyframes.length}</div>
              <div>导出格式: {config.format.toUpperCase()}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 时间轴编辑工具栏组件
 */
const TimelineEditToolbar: React.FC<{
  editMode: boolean;
  onToggleEditMode: () => void;
  onExport: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
}> = ({ editMode, onToggleEditMode, onExport, onSave, onLoad, onReset }) => {
  return (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg mb-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleEditMode}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            editMode
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {editMode ? '✓ 编辑模式' : '✏️ 编辑模式'}
        </button>
        
        {editMode && (
          <>
            <button
              onClick={onSave}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
              title="保存配置"
            >
              💾 保存
            </button>
            <button
              onClick={onLoad}
              className="px-3 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600"
              title="加载配置"
            >
              📁 加载
            </button>
            <button
              onClick={onReset}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
              title="重置配置"
            >
              🔄 重置
            </button>
          </>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={onExport}
          className="px-3 py-1 text-xs bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
          title="导出时间轴"
        >
          📤 导出
        </button>
      </div>
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
  onKeyframeDrag,
  onKeyframeDurationChange,
  onTimelineExport,
  onTimelineSave,
  onTimelineLoad,
  className = '',
  disabled = false,
  showKeyframes = true,
  showPreview = true,
  height = 40,
  editMode = false,
  allowKeyframeDrag = false,
  allowDurationEdit = false
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
  const [internalEditMode, setInternalEditMode] = useState(editMode);
  const [showExportDialog, setShowExportDialog] = useState(false);

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
    if (!internalEditMode) {
      onSeek(keyframe.time);
    }
  }, [disabled, onKeyframeClick, onSeek, internalEditMode]);

  // 编辑模式切换
  const handleToggleEditMode = useCallback(() => {
    setInternalEditMode(prev => !prev);
  }, []);

  // 导出处理
  const handleExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  const handleExportConfirm = useCallback((config: TimelineEditConfig) => {
    if (onTimelineExport) {
      onTimelineExport(config);
    }
  }, [onTimelineExport]);

  // 保存处理
  const handleSave = useCallback(() => {
    if (onTimelineSave) {
      const timelineData = {
        totalDuration,
        currentTime,
        keyframes,
        timestamp: Date.now(),
        version: '1.0'
      };
      onTimelineSave(timelineData);
    }
  }, [onTimelineSave, totalDuration, currentTime, keyframes]);

  // 加载处理
  const handleLoad = useCallback(() => {
    if (onTimelineLoad) {
      // 这里应该打开文件选择对话框，简化处理
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target?.result as string);
              onTimelineLoad(data);
            } catch (error) {
              console.error('Failed to load timeline data:', error);
              alert('加载时间轴配置失败，请检查文件格式');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  }, [onTimelineLoad]);

  // 重置处理
  const handleReset = useCallback(() => {
    if (confirm('确定要重置时间轴配置吗？此操作不可撤销。')) {
      // 重置到初始状态
      onSeek(0);
      setActiveKeyframe(null);
    }
  }, [onSeek]);

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
    <div className={`timeline-control ${className}`} style={{ height: height + (internalEditMode ? 40 : 0) }}>
      {/* 编辑工具栏 */}
      {(editMode || internalEditMode) && (
        <TimelineEditToolbar
          editMode={internalEditMode}
          onToggleEditMode={handleToggleEditMode}
          onExport={handleExport}
          onSave={handleSave}
          onLoad={handleLoad}
          onReset={handleReset}
        />
      )}

      {/* 时间显示 */}
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(totalDuration)}</span>
        {internalEditMode && (
          <span className="text-green-600 font-medium">编辑模式</span>
        )}
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
              editMode={internalEditMode}
              allowDrag={allowKeyframeDrag}
              onDrag={onKeyframeDrag}
              onDurationChange={onKeyframeDurationChange}
              totalDuration={totalDuration}
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
          {internalEditMode && (
            <span className="text-yellow-600">可拖拽关键帧调整位置</span>
          )}
        </div>
      </div>

      {/* 导出对话框 */}
      <TimelineExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExportConfirm}
        keyframes={keyframes}
        totalDuration={totalDuration}
      />
    </div>
  );
};

export default TimelineControl;