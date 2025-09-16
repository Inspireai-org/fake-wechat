import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Download, Settings, Save, FolderOpen, Trash2, Play, Pause, RotateCcw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ExportConfig, ExportProgress, ExportResult, QUALITY_PRESETS } from '../lib/exportEngine';
import { Message } from './ChatInterface';

// 导出预设接口
export interface ExportPreset {
  id: string;
  name: string;
  config: ExportConfig;
  createdAt: number;
  lastUsed?: number;
}

// 导出历史项接口
export interface ExportHistoryItem {
  id: string;
  filename: string;
  config: ExportConfig;
  fileSize: number;
  duration: number;
  exportedAt: number;
  success: boolean;
  error?: string;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => Promise<ExportResult>;
  messages: Message[];
  isExporting: boolean;
  exportProgress?: ExportProgress;
  onCancelExport?: () => void;
  
  // 预设管理
  presets: ExportPreset[];
  onSavePreset: (preset: Omit<ExportPreset, 'id' | 'createdAt'>) => void;
  onDeletePreset: (presetId: string) => void;
  onLoadPreset: (preset: ExportPreset) => void;
  
  // 历史记录
  exportHistory: ExportHistoryItem[];
  onReExport: (historyItem: ExportHistoryItem) => void;
  onClearHistory: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  messages,
  isExporting,
  exportProgress,
  onCancelExport,
  presets,
  onSavePreset,
  onDeletePreset,
  onLoadPreset,
  exportHistory,
  onReExport,
  onClearHistory
}) => {
  // 当前配置状态
  const [config, setConfig] = useState<ExportConfig>({
    format: 'gif',
    quality: 'medium',
    resolution: { width: 375, height: 667 },
    framerate: 20,
    customSettings: {
      bitrate: 1000,
      compression: 0.6,
      colorDepth: 128
    }
  });

  // UI状态
  const [activeTab, setActiveTab] = useState<'config' | 'presets' | 'history'>('config');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [estimatedFileSize, setEstimatedFileSize] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');

  // 格式选项
  const formatOptions = [
    { value: 'gif', label: 'GIF', description: '适合短动画，文件较小' },
    { value: 'mp4', label: 'MP4', description: '高质量视频，兼容性好' },
    { value: 'webm', label: 'WebM', description: '现代浏览器支持，压缩率高' }
  ] as const;

  // 质量选项
  const qualityOptions = [
    { value: 'high', label: '高质量', description: '最佳画质，文件较大' },
    { value: 'medium', label: '标准质量', description: '平衡画质和文件大小' },
    { value: 'low', label: '压缩质量', description: '较小文件，画质一般' },
    { value: 'custom', label: '自定义', description: '手动调整参数' }
  ] as const;

  // 分辨率预设
  const resolutionPresets = [
    { width: 375, height: 667, label: 'iPhone (375×667)' },
    { width: 414, height: 736, label: 'iPhone Plus (414×736)' },
    { width: 390, height: 844, label: 'iPhone 12 (390×844)' },
    { width: 360, height: 640, label: 'Android (360×640)' },
    { width: 320, height: 568, label: '小屏 (320×568)' }
  ];

  // 帧率预设
  const frameratePresets = [10, 15, 20, 24, 30, 60];

  // 计算预估文件大小和导出时长
  const calculateEstimates = useCallback(() => {
    if (messages.length === 0) {
      setEstimatedFileSize('0 MB');
      setEstimatedDuration('0 秒');
      return;
    }

    // 简化的估算算法
    const totalFrames = messages.length * (config.framerate / 10);
    const pixelCount = config.resolution.width * config.resolution.height;
    
    let bytesPerFrame = 0;
    switch (config.format) {
      case 'gif':
        bytesPerFrame = pixelCount * (config.customSettings?.colorDepth || 128) / 8 / 256;
        break;
      case 'mp4':
      case 'webm':
        bytesPerFrame = (config.customSettings?.bitrate || 1000) * 1000 / 8 / config.framerate;
        break;
    }

    const totalBytes = totalFrames * bytesPerFrame * (config.customSettings?.compression || 0.6);
    const fileSizeMB = totalBytes / (1024 * 1024);
    
    // 估算导出时长（基于经验值）
    const baseTime = messages.length * 0.5; // 每条消息0.5秒基础时间
    const complexityFactor = config.framerate / 20; // 帧率影响
    const qualityFactor = config.quality === 'high' ? 1.5 : config.quality === 'low' ? 0.7 : 1;
    const estimatedSeconds = baseTime * complexityFactor * qualityFactor;

    setEstimatedFileSize(fileSizeMB > 1 ? `${fileSizeMB.toFixed(1)} MB` : `${(fileSizeMB * 1024).toFixed(0)} KB`);
    setEstimatedDuration(estimatedSeconds > 60 ? `${Math.ceil(estimatedSeconds / 60)} 分钟` : `${Math.ceil(estimatedSeconds)} 秒`);
  }, [config, messages.length]);

  // 当配置改变时重新计算估算值
  useEffect(() => {
    calculateEstimates();
  }, [calculateEstimates]);

  // 应用质量预设
  const applyQualityPreset = useCallback((quality: string) => {
    if (quality !== 'custom' && QUALITY_PRESETS[quality]) {
      setConfig(prev => ({
        ...prev,
        ...QUALITY_PRESETS[quality],
        quality: quality as any
      }));
    } else {
      setConfig(prev => ({ ...prev, quality: quality as any }));
    }
  }, []);

  // 处理配置更新
  const updateConfig = useCallback((updates: Partial<ExportConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
      customSettings: {
        ...prev.customSettings,
        ...updates.customSettings
      }
    }));
  }, []);

  // 处理导出
  const handleExport = useCallback(async () => {
    try {
      const result = await onExport(config);
      
      // 导出成功后可以关闭对话框
      if (!isExporting) {
        onClose();
      }
    } catch (error) {
      console.error('导出失败:', error);
    }
  }, [config, onExport, isExporting, onClose]);

  // 保存预设
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    
    onSavePreset({
      name: presetName.trim(),
      config: { ...config }
    });
    
    setPresetName('');
    setShowSavePreset(false);
  }, [presetName, config, onSavePreset]);

  // 加载预设
  const handleLoadPreset = useCallback((preset: ExportPreset) => {
    setConfig({ ...preset.config });
    onLoadPreset(preset);
  }, [onLoadPreset]);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // 格式化时间
  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${seconds}秒`;
    }
  }, []);

  // 渲染进度条
  const renderProgressBar = () => {
    if (!isExporting || !exportProgress) return null;

    const { phase, percentage, currentFrame, totalFrames, estimatedTimeRemaining } = exportProgress;
    
    const phaseLabels = {
      preparing: '准备中',
      capturing: '捕获帧',
      encoding: '编码中',
      finalizing: '完成中'
    };

    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            {phaseLabels[phase]} ({currentFrame}/{totalFrames})
          </span>
          <span className="text-sm text-blue-700">
            {Math.round(percentage)}%
          </span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs text-blue-600">
          <span>预计剩余: {estimatedTimeRemaining > 0 ? formatDuration(estimatedTimeRemaining) : '计算中...'}</span>
          <div className="flex items-center space-x-2">
            {onCancelExport && (
              <button
                onClick={onCancelExport}
                className="px-2 py-1 text-red-600 hover:text-red-800 transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染配置选项卡
  const renderConfigTab = () => (
    <div className="space-y-6">
      {/* 基础配置 */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">基础设置</h4>
        
        {/* 导出格式 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">导出格式</label>
          <div className="grid grid-cols-3 gap-2">
            {formatOptions.map(option => (
              <button
                key={option.value}
                onClick={() => updateConfig({ format: option.value })}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  config.format === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 质量设置 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">质量设置</label>
          <div className="grid grid-cols-2 gap-2">
            {qualityOptions.map(option => (
              <button
                key={option.value}
                onClick={() => applyQualityPreset(option.value)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  config.quality === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 分辨率设置 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">分辨率</label>
          <div className="flex items-center space-x-2 mb-2">
            <select
              value={`${config.resolution.width}x${config.resolution.height}`}
              onChange={(e) => {
                const [width, height] = e.target.value.split('x').map(Number);
                updateConfig({ resolution: { width, height } });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {resolutionPresets.map(preset => (
                <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">自定义</option>
            </select>
          </div>
          
          {/* 自定义分辨率输入 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">宽度</label>
              <input
                type="number"
                value={config.resolution.width}
                onChange={(e) => updateConfig({ 
                  resolution: { ...config.resolution, width: parseInt(e.target.value) || 375 }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="200"
                max="1920"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">高度</label>
              <input
                type="number"
                value={config.resolution.height}
                onChange={(e) => updateConfig({ 
                  resolution: { ...config.resolution, height: parseInt(e.target.value) || 667 }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="200"
                max="1920"
              />
            </div>
          </div>
        </div>

        {/* 帧率设置 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">帧率 (FPS)</label>
          <div className="flex items-center space-x-2">
            <select
              value={config.framerate}
              onChange={(e) => updateConfig({ framerate: parseInt(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {frameratePresets.map(fps => (
                <option key={fps} value={fps}>{fps} FPS</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              {config.framerate <= 15 ? '流畅' : config.framerate <= 30 ? '标准' : '高清'}
            </span>
          </div>
        </div>
      </div>

      {/* 高级设置 */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-3"
        >
          <Settings className="w-4 h-4" />
          <span>高级设置</span>
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showAdvanced && config.quality === 'custom' && (
          <div className="space-y-4 pl-6 border-l-2 border-gray-200">
            {/* 比特率 (仅视频格式) */}
            {(config.format === 'mp4' || config.format === 'webm') && (
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  比特率 (kbps): {config.customSettings?.bitrate || 1000}
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={config.customSettings?.bitrate || 1000}
                  onChange={(e) => updateConfig({
                    customSettings: { ...config.customSettings, bitrate: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100</span>
                  <span>5000</span>
                </div>
              </div>
            )}

            {/* 压缩比例 */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                压缩比例: {((config.customSettings?.compression || 0.6) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={config.customSettings?.compression || 0.6}
                onChange={(e) => updateConfig({
                  customSettings: { ...config.customSettings, compression: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>

            {/* 颜色深度 (仅GIF格式) */}
            {config.format === 'gif' && (
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  颜色深度: {config.customSettings?.colorDepth || 128} 色
                </label>
                <input
                  type="range"
                  min="16"
                  max="256"
                  step="16"
                  value={config.customSettings?.colorDepth || 128}
                  onChange={(e) => updateConfig({
                    customSettings: { ...config.customSettings, colorDepth: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>16</span>
                  <span>256</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 预估信息 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">预估信息</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">文件大小:</span>
            <span className="ml-2 font-medium">{estimatedFileSize}</span>
          </div>
          <div>
            <span className="text-gray-600">导出时长:</span>
            <span className="ml-2 font-medium">{estimatedDuration}</span>
          </div>
          <div>
            <span className="text-gray-600">总帧数:</span>
            <span className="ml-2 font-medium">{messages.length * Math.ceil(config.framerate / 10)}</span>
          </div>
          <div>
            <span className="text-gray-600">消息数:</span>
            <span className="ml-2 font-medium">{messages.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染预设选项卡
  const renderPresetsTab = () => (
    <div className="space-y-4">
      {/* 保存当前配置为预设 */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">保存当前配置</h4>
          <button
            onClick={() => setShowSavePreset(!showSavePreset)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Save className="w-4 h-4 inline mr-1" />
            保存预设
          </button>
        </div>
        
        {showSavePreset && (
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="输入预设名称..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePreset();
                } else if (e.key === 'Escape') {
                  setShowSavePreset(false);
                  setPresetName('');
                }
              }}
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-300"
            >
              保存
            </button>
            <button
              onClick={() => {
                setShowSavePreset(false);
                setPresetName('');
              }}
              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* 预设列表 */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">已保存的预设</h4>
        {presets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无保存的预设</p>
            <p className="text-xs mt-1">保存常用的导出配置以便快速使用</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map(preset => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {preset.config.format.toUpperCase()} • {preset.config.quality} • {preset.config.resolution.width}×{preset.config.resolution.height} • {preset.config.framerate}fps
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    创建于 {new Date(preset.createdAt).toLocaleDateString()}
                    {preset.lastUsed && ` • 最后使用 ${new Date(preset.lastUsed).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleLoadPreset(preset)}
                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3 inline mr-1" />
                    加载
                  </button>
                  <button
                    onClick={() => onDeletePreset(preset.id)}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 渲染历史选项卡
  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">导出历史</h4>
        {exportHistory.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            <Trash2 className="w-4 h-4 inline mr-1" />
            清空历史
          </button>
        )}
      </div>

      {exportHistory.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无导出历史</p>
          <p className="text-xs mt-1">完成导出后会在这里显示记录</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {exportHistory
            .sort((a, b) => b.exportedAt - a.exportedAt)
            .map(item => (
              <div
                key={item.id}
                className={`p-3 border rounded-lg ${
                  item.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {item.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{item.filename}</span>
                    </div>
                    
                    <div className="text-xs text-gray-600 mt-1">
                      {item.config.format.toUpperCase()} • {item.config.quality} • {item.config.resolution.width}×{item.config.resolution.height}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(item.exportedAt).toLocaleString()} • 
                      {item.success ? (
                        <>
                          {formatFileSize(item.fileSize)} • 耗时 {formatDuration(item.duration)}
                        </>
                      ) : (
                        <span className="text-red-600 ml-1">{item.error}</span>
                      )}
                    </div>
                  </div>
                  
                  {item.success && (
                    <button
                      onClick={() => onReExport(item)}
                      className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      重新导出
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">导出配置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 进度条 */}
        {renderProgressBar()}

        {/* 选项卡导航 */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'config', label: '配置', icon: Settings },
            { key: 'presets', label: '预设', icon: Save },
            { key: 'history', label: '历史', icon: Clock }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isExporting}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="p-4 overflow-y-auto max-h-96">
          {activeTab === 'config' && renderConfigTab()}
          {activeTab === 'presets' && renderPresetsTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {messages.length === 0 ? (
              <span className="text-red-600">请先添加消息内容</span>
            ) : (
              <span>准备导出 {messages.length} 条消息</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isExporting}
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || messages.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '导出中...' : '开始导出'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};