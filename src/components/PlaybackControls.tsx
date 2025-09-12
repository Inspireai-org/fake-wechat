import React from 'react';
import { Play, Pause, RotateCcw, Download } from 'lucide-react';
import { AnimationState, AnimationControls } from '../hooks/useAnimationControl';

interface PlaybackControlsProps {
  animationState: AnimationState;
  animationControls: AnimationControls;
  onExportGif: () => void;
  isExporting?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  animationState,
  animationControls,
  onExportGif,
  isExporting = false
}) => {
  const { isPlaying, currentMessageIndex, playbackSpeed, totalMessages } = animationState;
  const { play, pause, reset, setSpeed } = animationControls;

  const progress = totalMessages > 0 ? ((currentMessageIndex + 1) / totalMessages) * 100 : 0;

  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' }
  ];

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 text-sm">
      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>进度</span>
          <span>{currentMessageIndex + 1} / {totalMessages}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-[#07C160] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* 播放/暂停按钮 */}
          <button
            onClick={isPlaying ? pause : play}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#07C160] text-white rounded-full hover:bg-[#06B050] transition-colors"
            disabled={totalMessages === 0}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
            )}
          </button>

          {/* 重置按钮 */}
          <button
            onClick={reset}
            className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            disabled={totalMessages === 0}
          >
            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>

          {/* 播放速度选择 */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-xs text-gray-600 hidden sm:inline">速度:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#07C160] focus:border-transparent"
              disabled={totalMessages === 0}
            >
              {speedOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 导出按钮 */}
        <button
          onClick={onExportGif}
          disabled={isExporting || totalMessages === 0}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">{isExporting ? '导出中...' : '导出GIF'}</span>
          <span className="sm:hidden">{isExporting ? '导出中' : 'GIF'}</span>
        </button>
      </div>

      {/* 状态信息 */}
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>
          {isPlaying ? '播放中' : currentMessageIndex >= totalMessages - 1 ? '播放完成' : '已暂停'}
        </span>
        <span>
          播放速度: {playbackSpeed}x
        </span>
      </div>
    </div>
  );
};