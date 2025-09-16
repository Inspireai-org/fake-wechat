import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Repeat, Eye, SkipBack, SkipForward, Minus, Plus, HelpCircle, X } from 'lucide-react';
import { PlaybackState, PlaybackControls as PlaybackControlsType } from '../hooks/usePlaybackState';
import { TimelineControl, Keyframe } from './TimelineControl';
import { Message } from './ChatInterface';

interface PlaybackControlsProps {
  // 新的播放状态接口
  playbackState: PlaybackState;
  playbackControls: PlaybackControlsType;
  
  // 消息数据用于生成关键帧
  messages: Message[];
  
  // 导出功能
  onExportGif: () => void;
  isExporting?: boolean;
  
  // 预览回调
  onPreview?: (time: number) => void;
  
  // 可选配置
  className?: string;
  showTimeline?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackState,
  playbackControls,
  messages,
  onExportGif,
  isExporting = false,
  onPreview,
  className = '',
  showTimeline = true
}) => {
  // 本地状态
  const [showSpeedInput, setShowSpeedInput] = useState(false);
  const [customSpeed, setCustomSpeed] = useState(playbackState.playbackSpeed.toString());
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // 解构播放状态和控制方法
  const {
    isPlaying,
    currentMessageIndex,
    playbackSpeed,
    totalDuration,
    currentTime,
    playMode,
    visibleMessages
  } = playbackState;

  const {
    play,
    pause,
    reset,
    setPlaybackSpeed,
    setPlayMode,
    seekToTime,
    seekToMessage,
    undo,
    redo,
    canUndo,
    canRedo
  } = playbackControls;

  // 计算进度
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // 预设速度选项（扩展到0.1x-5x范围）
  const speedPresets = [
    { value: 0.1, label: '0.1x' },
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1, label: '1x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
    { value: 3, label: '3x' },
    { value: 4, label: '4x' },
    { value: 5, label: '5x' }
  ];

  // 解析描述性时间
  const parseDescriptiveTime = (duration: string | undefined): number => {
    if (!duration) return 800;
    
    const descriptiveTimeMap: Record<string, number> = {
      '稍后': 1000,
      '片刻后': 1500,
      '一会儿后': 2000,
      '很久之后': 3000,
      '许久之后': 4000,
      '短': 500,
      'short': 500,
      '中': 1000,
      'medium': 1000,
      '长': 2000,
      'long': 2000,
    };
    
    const normalizedDuration = duration.toLowerCase().replace(/\s+/g, '');
    if (descriptiveTimeMap[normalizedDuration]) {
      return descriptiveTimeMap[normalizedDuration];
    }
    
    const match = duration.match(/(\d+\.?\d*)\s*(秒|s|sec|second|分钟|m|min|minute|小时|h|hour)?/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2] || 's';
      
      switch (unit.toLowerCase()) {
        case '秒':
        case 's':
        case 'sec':
        case 'second':
          return value * 1000;
        case '分钟':
        case 'm':
        case 'min':
        case 'minute':
          return value * 60 * 1000;
        case '小时':
        case 'h':
        case 'hour':
          return value * 60 * 60 * 1000;
        default:
          return value * 1000;
      }
    }
    
    return 1500;
  };

  // 获取消息时长的辅助函数
  const getMessageDuration = (message: Message): number => {
    if (message.type === 'pause') {
      return parseDescriptiveTime(message.duration);
    } else if (message.type === 'typing') {
      return parseDescriptiveTime(message.statusDuration || message.duration || '3s');
    } else if (message.type === 'recall') {
      return parseDescriptiveTime(message.recallDelay);
    } else {
      if (message.animationDelay) {
        return parseDescriptiveTime(message.animationDelay);
      } else {
        const contentLength = message.content?.length || 0;
        const baseDelay = 800;
        const extraDelay = contentLength * 20;
        return Math.max(baseDelay, Math.min(baseDelay + extraDelay, 1500));
      }
    }
  };

  // 获取关键帧类型
  const getKeyframeType = (message: Message): Keyframe['type'] => {
    switch (message.type) {
      case 'voice':
        return 'voice';
      case 'image':
        return 'image';
      case 'location':
        return 'location';
      case 'recall':
        return 'recall';
      case 'typing':
        return 'typing';
      case 'pause':
        return 'pause';
      default:
        return 'message';
    }
  };

  // 获取关键帧标题
  const getKeyframeTitle = (message: Message, index: number): string => {
    switch (message.type) {
      case 'voice':
        return `语音消息 #${index + 1}`;
      case 'image':
        return `图片消息 #${index + 1}`;
      case 'location':
        return `位置消息 #${index + 1}`;
      case 'recall':
        return `撤回消息 #${index + 1}`;
      case 'typing':
        return `输入状态 #${index + 1}`;
      case 'pause':
        return `暂停 #${index + 1}`;
      default:
        const content = message.content || '';
        const preview = content.length > 20 ? content.substring(0, 20) + '...' : content;
        return `消息 #${index + 1}: ${preview}`;
    }
  };

  // 获取关键帧颜色
  const getKeyframeColor = (message: Message): string => {
    switch (message.type) {
      case 'voice':
        return '#10B981'; // 绿色
      case 'image':
        return '#3B82F6'; // 蓝色
      case 'location':
        return '#F59E0B'; // 橙色
      case 'recall':
        return '#EF4444'; // 红色
      case 'typing':
        return '#8B5CF6'; // 紫色
      case 'pause':
        return '#6B7280'; // 灰色
      default:
        return '#1F2937'; // 深灰色
    }
  };

  // 生成关键帧数据
  const keyframes = useMemo((): Keyframe[] => {
    let accumulatedTime = 0;
    const frames: Keyframe[] = [];

    messages.forEach((message, index) => {
      // 计算消息时长（简化版本）
      const duration = getMessageDuration(message);
      
      // 生成关键帧
      const keyframe: Keyframe = {
        id: `message-${index}`,
        time: accumulatedTime,
        messageIndex: index,
        type: getKeyframeType(message),
        title: getKeyframeTitle(message, index),
        color: getKeyframeColor(message)
      };
      
      frames.push(keyframe);
      accumulatedTime += duration;
    });

    return frames;
  }, [messages]);

  // 事件处理函数
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    setCustomSpeed(speed.toString());
  }, [setPlaybackSpeed]);

  const handleCustomSpeedSubmit = useCallback(() => {
    const speed = parseFloat(customSpeed);
    if (!isNaN(speed) && speed >= 0.1 && speed <= 5) {
      handleSpeedChange(speed);
    } else {
      setCustomSpeed(playbackSpeed.toString());
    }
    setShowSpeedInput(false);
  }, [customSpeed, playbackSpeed, handleSpeedChange]);

  const handleSpeedAdjust = useCallback((delta: number) => {
    const newSpeed = Math.max(0.1, Math.min(5, playbackSpeed + delta));
    handleSpeedChange(Math.round(newSpeed * 10) / 10); // 保留一位小数
  }, [playbackSpeed, handleSpeedChange]);

  const handlePlayModeChange = useCallback((mode: 'normal' | 'loop' | 'preview') => {
    setPlayMode(mode);
  }, [setPlayMode]);

  const handleTimelineSeek = useCallback((time: number) => {
    seekToTime(time);
  }, [seekToTime]);

  const handleTimelinePreview = useCallback((time: number) => {
    onPreview?.(time);
  }, [onPreview]);

  const handleKeyframeClick = useCallback((keyframe: Keyframe) => {
    seekToTime(keyframe.time);
  }, [seekToTime]);

  const handlePreviousMessage = useCallback(() => {
    const prevIndex = Math.max(-1, currentMessageIndex - 1);
    seekToMessage(prevIndex);
  }, [currentMessageIndex, seekToMessage]);

  const handleNextMessage = useCallback(() => {
    const nextIndex = Math.min(messages.length - 1, currentMessageIndex + 1);
    seekToMessage(nextIndex);
  }, [currentMessageIndex, messages.length, seekToMessage]);

  // 键盘快捷键处理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果正在输入或者显示帮助面板，不处理快捷键
    if (showSpeedInput || showHelpPanel) return;
    
    // 检查是否在输入框中
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        handlePlayPause();
        break;
      
      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift + 左箭头：快速后退
          const newTime = Math.max(0, currentTime - 5000); // 后退5秒
          seekToTime(newTime);
        } else {
          // 左箭头：上一条消息
          handlePreviousMessage();
        }
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift + 右箭头：快速前进
          const newTime = Math.min(totalDuration, currentTime + 5000); // 前进5秒
          seekToTime(newTime);
        } else {
          // 右箭头：下一条消息
          handleNextMessage();
        }
        break;
      
      case 'Home':
        event.preventDefault();
        handleReset();
        break;
      
      case 'End':
        event.preventDefault();
        seekToMessage(messages.length - 1);
        break;
      
      // 数字键快速设置播放速度
      case 'Digit1':
        event.preventDefault();
        handleSpeedChange(0.25);
        break;
      case 'Digit2':
        event.preventDefault();
        handleSpeedChange(0.5);
        break;
      case 'Digit3':
        event.preventDefault();
        handleSpeedChange(1);
        break;
      case 'Digit4':
        event.preventDefault();
        handleSpeedChange(1.5);
        break;
      case 'Digit5':
        event.preventDefault();
        handleSpeedChange(2);
        break;
      case 'Digit6':
        event.preventDefault();
        handleSpeedChange(4);
        break;
      
      // 播放模式切换
      case 'KeyN':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handlePlayModeChange('normal');
        }
        break;
      case 'KeyL':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handlePlayModeChange('loop');
        }
        break;
      case 'KeyP':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handlePlayModeChange('preview');
        }
        break;
      
      // 撤销/重做
      case 'KeyZ':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        break;
      
      // 速度调节
      case 'Minus':
      case 'NumpadSubtract':
        event.preventDefault();
        handleSpeedAdjust(-0.1);
        break;
      case 'Equal':
      case 'NumpadAdd':
        event.preventDefault();
        handleSpeedAdjust(0.1);
        break;
      
      // 帮助面板
      case 'F1':
      case 'Slash':
        if (event.key === '/' && event.shiftKey) {
          event.preventDefault();
          setShowHelpPanel(!showHelpPanel);
        } else if (event.code === 'F1') {
          event.preventDefault();
          setShowHelpPanel(!showHelpPanel);
        }
        break;
      
      // ESC 关闭帮助面板
      case 'Escape':
        if (showHelpPanel) {
          event.preventDefault();
          setShowHelpPanel(false);
        }
        break;
    }
  }, [
    showSpeedInput,
    showHelpPanel,
    handlePlayPause,
    currentTime,
    totalDuration,
    seekToTime,
    handlePreviousMessage,
    handleNextMessage,
    handleReset,
    messages.length,
    seekToMessage,
    handleSpeedChange,
    handlePlayModeChange,
    undo,
    redo,
    handleSpeedAdjust
  ]);

  // 注册键盘事件监听器
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 快捷键帮助面板组件
  const HelpPanel: React.FC = () => {
    if (!showHelpPanel) return null;

    const shortcuts = [
      { key: '空格键', description: '播放/暂停' },
      { key: '←/→', description: '上一条/下一条消息' },
      { key: 'Shift + ←/→', description: '快速后退/前进 5秒' },
      { key: 'Home', description: '重置到开始' },
      { key: 'End', description: '跳转到最后一条消息' },
      { key: '1-6', description: '快速设置播放速度 (0.25x-4x)' },
      { key: '-/+', description: '减速/加速 0.1x' },
      { key: 'Ctrl+N', description: '切换到普通模式' },
      { key: 'Ctrl+L', description: '切换到循环模式' },
      { key: 'Ctrl+P', description: '切换到预览模式' },
      { key: 'Ctrl+Z', description: '撤销' },
      { key: 'Ctrl+Shift+Z', description: '重做' },
      { key: '? 或 F1', description: '显示/隐藏帮助' },
      { key: 'ESC', description: '关闭帮助面板' }
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">键盘快捷键</h3>
            <button
              onClick={() => setShowHelpPanel(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                提示：在输入框中时快捷键不会生效
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border-t border-gray-200 px-4 py-3 text-sm ${className}`}>
      {/* 时间轴控制器 */}
      {showTimeline && (
        <div className="mb-4">
          <TimelineControl
            totalDuration={totalDuration}
            currentTime={currentTime}
            keyframes={keyframes}
            isPlaying={isPlaying}
            onSeek={handleTimelineSeek}
            onPreview={handleTimelinePreview}
            onKeyframeClick={handleKeyframeClick}
            disabled={messages.length === 0}
            className="mb-2"
          />
        </div>
      )}

      {/* 播放模式切换 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">播放模式:</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePlayModeChange('normal')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                playMode === 'normal'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={messages.length === 0}
              title="普通模式 (Ctrl+N)"
            >
              普通
            </button>
            <button
              onClick={() => handlePlayModeChange('loop')}
              className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center space-x-1 ${
                playMode === 'loop'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={messages.length === 0}
              title="循环模式 (Ctrl+L)"
            >
              <Repeat className="w-3 h-3" />
              <span>循环</span>
            </button>
            <button
              onClick={() => handlePlayModeChange('preview')}
              className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center space-x-1 ${
                playMode === 'preview'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={messages.length === 0}
              title="预览模式 (Ctrl+P)"
            >
              <Eye className="w-3 h-3" />
              <span>预览</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主控制区域 */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
        {/* 左侧控制按钮组 */}
        <div className="flex items-center space-x-2">
          {/* 上一条消息 */}
          <button
            onClick={handlePreviousMessage}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            disabled={messages.length === 0 || currentMessageIndex <= -1}
            title="上一条消息 (←)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* 播放/暂停按钮 */}
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center w-10 h-10 bg-[#07C160] text-white rounded-full hover:bg-[#06B050] transition-colors"
            disabled={messages.length === 0}
            title={isPlaying ? '暂停 (空格键)' : '播放 (空格键)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* 下一条消息 */}
          <button
            onClick={handleNextMessage}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            disabled={messages.length === 0 || currentMessageIndex >= messages.length - 1}
            title="下一条消息 (→)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* 重置按钮 */}
          <button
            onClick={handleReset}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            disabled={messages.length === 0}
            title="重置 (Home)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* 撤销/重做按钮 */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={undo}
              className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={!canUndo()}
              title="撤销 (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={redo}
              className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={!canRedo()}
              title="重做 (Ctrl+Shift+Z)"
            >
              ↷
            </button>
          </div>

          {/* 帮助按钮 */}
          <button
            onClick={() => setShowHelpPanel(true)}
            className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors ml-2"
            title="键盘快捷键 (F1 或 ?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* 中间速度控制区域 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600 hidden sm:inline">速度:</span>
          
          {/* 速度调节按钮 */}
          <button
            onClick={() => handleSpeedAdjust(-0.1)}
            className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            disabled={playbackSpeed <= 0.1}
            title="减速 (-)"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* 速度显示/输入 */}
          {showSpeedInput ? (
            <input
              type="number"
              value={customSpeed}
              onChange={(e) => setCustomSpeed(e.target.value)}
              onBlur={handleCustomSpeedSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSpeedSubmit();
                } else if (e.key === 'Escape') {
                  setCustomSpeed(playbackSpeed.toString());
                  setShowSpeedInput(false);
                }
              }}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0.1"
              max="5"
              step="0.1"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowSpeedInput(true)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors min-w-[3rem]"
              title="点击自定义速度"
            >
              {playbackSpeed}x
            </button>
          )}

          <button
            onClick={() => handleSpeedAdjust(0.1)}
            className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            disabled={playbackSpeed >= 5}
            title="加速 (+)"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* 速度预设选择 */}
          <select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            disabled={messages.length === 0}
          >
            {speedPresets.map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* 右侧导出按钮 */}
        <button
          onClick={onExportGif}
          disabled={isExporting || messages.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? '导出中...' : '导出'}</span>
        </button>
      </div>

      {/* 状态信息栏 */}
      <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>
            {isPlaying ? '播放中' : currentMessageIndex >= messages.length - 1 ? '播放完成' : '已暂停'}
          </span>
          <span>
            消息: {Math.max(0, currentMessageIndex + 1)} / {messages.length}
          </span>
          <span>
            模式: {playMode === 'normal' ? '普通' : playMode === 'loop' ? '循环' : '预览'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span>
            进度: {Math.round(progress)}%
          </span>
          <span>
            速度: {playbackSpeed}x
          </span>
        </div>
      </div>

      {/* 快捷键帮助面板 */}
      <HelpPanel />
    </div>
  );
};