import React, { useState, useRef, useEffect } from 'react';
import { ChatInterface, ChatData } from './components/ChatInterface';
import { ConfigPanel } from './components/ConfigPanel';
import { PlaybackControls } from './components/PlaybackControls';
import { ExportDialog, ExportPreset, ExportHistoryItem } from './components/ExportDialog';
import { usePlaybackState } from './hooks/usePlaybackState';
import { useGifExport } from './hooks/useGifExport';
import { ExportConfig, ExportResult } from './lib/exportEngine';
import { parseYamlConfig } from './lib/yamlParser';
import WeChatNavBar from './components/WeChatNavBar';
import IPhoneFrame from './components/iPhoneFrame';

function App() {
  const [chatData, setChatData] = useState<ChatData>({
    scene: {
      title: "朋友间的对话",
      participants: [
        { name: "小明", avatar: "https://ui-avatars.com/api/?name=XM&background=4A90E2&color=fff&size=200" },
        { name: "小红", avatar: "https://ui-avatars.com/api/?name=XH&background=FF6B6B&color=fff&size=200" }
      ]
    },
    messages: [
      {
        speaker: "小明",
        content: "你今天有空吗？",
        time: "10:30",
        type: "message"
      },
      {
        speaker: "小红",
        content: "现在在忙，等会儿联系你",
        time: "10:31",
        type: "message"
      }
    ]
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 播放状态控制
  const [playbackState, playbackControls] = usePlaybackState({
    messages: chatData.messages,
    onAnimationComplete: () => {
      console.log('Animation completed');
    }
  });

  // GIF导出
  const { exportState, exportToGif, resetExportState: _resetExportState } = useGifExport();
  
  // 导出对话框状态
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPresets, setExportPresets] = useState<ExportPreset[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [isExportMode, setIsExportMode] = useState(false);
  const [exportMessageIndex, setExportMessageIndex] = useState(-1);
  
  // 处理聊天数据更新
  const handleChatDataChange = (newChatData: ChatData) => {
    setChatData(newChatData);
  };
  
  // 处理YAML更新
  const handleYamlChange = (yaml: string) => {
    try {
      const newChatData = parseYamlConfig(yaml);
      setChatData(newChatData);
    } catch (error) {
      console.error('Failed to parse YAML:', error);
    }
  };
  
  // 处理打开导出对话框
  const handleOpenExportDialog = () => {
    setShowExportDialog(true);
  };
  
  // 处理导出
  const handleExport = async (config: ExportConfig): Promise<ExportResult> => {
    if (!chatContainerRef.current) {
      throw new Error('No chat container');
    }
    
    // 目前只支持GIF导出，后续可以添加MP4和WebM支持
    if (config.format === 'gif') {
      // 重置导出模式状态
      setIsExportMode(false);
      setExportMessageIndex(-1);
      
      await exportToGif(chatContainerRef, chatData.messages, {
        width: config.resolution.width,
        height: config.resolution.height,
        quality: config.quality === 'high' ? 5 : config.quality === 'low' ? 20 : 10,
        delay: 1500,
        repeat: 0
      });
      
      // 记录到历史
      const historyItem: ExportHistoryItem = {
        id: Date.now().toString(),
        filename: `wechat-chat-${Date.now()}.gif`,
        config,
        fileSize: 0, // 暂时无法获取实际文件大小
        duration: 0, // 暂时无法获取实际导出时长
        exportedAt: Date.now(),
        success: !exportState.error,
        error: exportState.error || undefined
      };
      setExportHistory(prev => [...prev, historyItem]);
      
      // 返回GIF导出结果
      return {
        blob: new Blob(), // 暂时无法获取实际blob
        filename: `wechat-chat-${Date.now()}.gif`,
        fileSize: 0,
        duration: 0,
        config
      };
    } else {
      // MP4和WebM暂未实现
      throw new Error(`${config.format.toUpperCase()} 导出功能暂未实现`);
    }
  };
  
  // 处理保存预设
  const handleSavePreset = (preset: Omit<ExportPreset, 'id' | 'createdAt'>) => {
    const newPreset: ExportPreset = {
      ...preset,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    setExportPresets(prev => [...prev, newPreset]);
  };
  
  // 处理删除预设
  const handleDeletePreset = (presetId: string) => {
    setExportPresets(prev => prev.filter(p => p.id !== presetId));
  };
  
  // 处理加载预设
  const handleLoadPreset = (preset: ExportPreset) => {
    // 更新最后使用时间
    setExportPresets(prev => prev.map(p => 
      p.id === preset.id ? { ...p, lastUsed: Date.now() } : p
    ));
  };
  
  // 处理重新导出
  const handleReExport = (historyItem: ExportHistoryItem) => {
    // 使用历史项的配置重新导出
    handleExport(historyItem.config);
  };
  
  // 处理清空历史
  const handleClearHistory = () => {
    setExportHistory([]);
  };



  // 监听消息索引更新事件（用于GIF导出）
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleUpdateMessageIndex = (event: CustomEvent) => {
      // 在导出模式下，直接更新导出消息索引
      setIsExportMode(true);
      setExportMessageIndex(event.detail);
    };
    
    const handleExportComplete = () => {
      // 导出完成，重置导出模式
      setIsExportMode(false);
      setExportMessageIndex(-1);
    };

    container.addEventListener('updateMessageIndex', handleUpdateMessageIndex as EventListener);
    container.addEventListener('exportComplete', handleExportComplete as EventListener);
    return () => {
      container.removeEventListener('updateMessageIndex', handleUpdateMessageIndex as EventListener);
      container.removeEventListener('exportComplete', handleExportComplete as EventListener);
    };
  }, [playbackControls]);

  // 计算当前是否显示输入状态
  const getCurrentTypingStatus = () => {
    const currentMessage = chatData.messages[playbackState.currentMessageIndex];
    if (currentMessage?.type === 'typing' && playbackState.isPlaying) {
      const speaker = currentMessage.speaker;
      const typingUser = chatData.scene.participants.find(p => p.name === speaker);
      // 如果输入者不是当前用户（第一个参与者），显示输入状态
      if (typingUser && typingUser.name !== chatData.scene.participants[0]?.name) {
        return {
          isTyping: true,
          typingText: `${speaker}正在输入...`
        };
      }
    }
    return { isTyping: false, typingText: '' };
  };

  const typingStatus = getCurrentTypingStatus();

  // 加载默认YAML配置
  useEffect(() => {
    fetch('/sample.yaml')
      .then(response => response.text())
      .then(yaml => {
        try {
          const defaultChatData = parseYamlConfig(yaml);
          setChatData(defaultChatData);
        } catch (error) {
          console.error('Failed to load default YAML:', error);
        }
      })
      .catch(error => {
        console.error('Failed to fetch sample.yaml:', error);
      });
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-100 flex">
      {/* 左侧：手机预览区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <IPhoneFrame>
          <div ref={chatContainerRef} className="h-full w-full flex flex-col">
            <WeChatNavBar 
              contactName={chatData.scene.participants.find((p: { name: string }) => p.name !== chatData.scene.participants[0]?.name)?.name || '聊天'}
              isTyping={typingStatus.isTyping}
              typingText={typingStatus.typingText}
            />
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                chatData={chatData}
                currentMessageIndex={isExportMode ? exportMessageIndex : playbackState.currentMessageIndex}
                isPlaying={isExportMode ? true : playbackState.isPlaying}
                playMode={isExportMode ? 'normal' : playbackState.playMode}
                shouldAutoScroll={playbackState.shouldAutoScroll}
                scrollPosition={playbackState.scrollPosition}
                onScrollPositionChange={playbackControls.setScrollPosition}
              />
            </div>
          </div>
        </IPhoneFrame>
        
        {/* 播放控制器 */}
        <div className="mt-3 w-full max-w-sm">
          <PlaybackControls
            playbackState={playbackState}
            playbackControls={playbackControls}
            messages={chatData.messages}
            onExportGif={handleOpenExportDialog}
            isExporting={exportState.isExporting}
          />
        </div>
      </div>
      
      {/* 右侧：配置面板 */}
      <ConfigPanel
        chatData={chatData}
        onChatDataChange={handleChatDataChange}
        onYamlChange={handleYamlChange}
      />
      
      {/* 导出对话框 */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        messages={chatData.messages}
        isExporting={exportState.isExporting}
        exportProgress={exportState.isExporting ? {
          phase: 'capturing',
          percentage: exportState.progress,
          currentFrame: Math.floor(exportState.progress / 100 * chatData.messages.length),
          totalFrames: chatData.messages.length,
          estimatedTimeRemaining: 0,
          currentFileSize: 0
        } : undefined}
        presets={exportPresets}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        onLoadPreset={handleLoadPreset}
        exportHistory={exportHistory}
        onReExport={handleReExport}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}

export default App;
